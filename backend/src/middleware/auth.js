const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { clerkClient } = require('@clerk/express');
const { supabase } = require('../lib/supabase');

// In-memory cache for user IDs to avoid database lookups on every request
// Key: clerk_id, Value: { internalUserId, timestamp }
const userCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const isDatabaseUnavailableError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('fetch failed') || message.includes('network');
};

/**
 * Normalize PEM key from environment variable
 * Handles both multi-line PEM and single-line with escaped newlines (\n)
 * Also strips surrounding quotes that some env parsers add
 */
function normalizePemKey(key) {
    if (!key) return null;
    
    let normalized = key
        .trim()
        // Remove surrounding quotes (single or double)
        .replace(/^["']|["']$/g, '')
        // Convert literal \n strings to actual newlines
        .replace(/\\n/g, '\n');
    
    // Validate it looks like a PEM key
    if (!normalized.includes('-----BEGIN') || !normalized.includes('-----END')) {
        console.error('Auth: CLERK_JWT_PUBLIC_KEY does not appear to be a valid PEM key');
        return null;
    }
    
    return normalized;
}

/**
 * Create a proper crypto KeyObject from PEM string
 */
function createPublicKey(pemString) {
    if (!pemString) return null;
    
    try {
        const keyObject = crypto.createPublicKey({
            key: pemString,
            format: 'pem'
        });
        console.log('Auth: Successfully created public key object');
        return keyObject;
    } catch (err) {
        console.error('Auth: Failed to create public key object:', err.message);
        console.error('Auth: PEM key first 50 chars:', pemString.substring(0, 50));
        return null;
    }
}

// Initialize JWT public key on startup
const pemKey = normalizePemKey(process.env.CLERK_JWT_PUBLIC_KEY);
const jwtPublicKey = createPublicKey(pemKey);
const hasPublicKey = !!jwtPublicKey;

console.log(`Auth: JWT public key configured: ${hasPublicKey}`);
if (hasPublicKey) {
    console.log('Auth: Using local JWT verification with jsonwebtoken (no network calls)');
} else {
    console.error('Auth: WARNING - CLERK_JWT_PUBLIC_KEY not set or invalid!');
    console.error('Auth: Get it from Clerk Dashboard > API Keys > Show JWT Public Key');
}

/**
 * Clerk JWT Authentication Middleware
 * Validates Bearer token using jsonwebtoken library (NO network calls)
 * 
 * REQUIRED: Set CLERK_JWT_PUBLIC_KEY environment variable
 * Get from: Clerk Dashboard > Configure > API Keys > Show JWT Public Key
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid Authorization header'
            });
        }

        const token = authHeader.split(' ')[1];

        // Check if we have the public key configured
        if (!jwtPublicKey) {
            console.error('Auth: Cannot verify token - CLERK_JWT_PUBLIC_KEY not configured');
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'Authentication not configured. Please contact support.'
            });
        }

        // Verify the JWT using jsonwebtoken (completely local, no network)
        let payload;
        try {
            payload = jwt.verify(token, jwtPublicKey, {
                algorithms: ['RS256'], // Clerk uses RS256
            });
        } catch (verifyError) {
            if (verifyError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token has expired'
                });
            } else if (verifyError.name === 'JsonWebTokenError') {
                console.error('Auth: JWT verification failed:', verifyError.message);
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token'
                });
            }
            throw verifyError;
        }

        // Attach user info to request
        // Clerk JWT payload has 'sub' as user ID
        req.auth = {
            userId: payload.sub,
            sessionId: payload.sid,
            email: payload.email || payload.primary_email
        };

        // Get or create user in Supabase (with caching)
        try {
            await ensureUserExists(req.auth);
        } catch (dbError) {
            const unavailable = isDatabaseUnavailableError(dbError);
            console.error('Auth bootstrap error:', {
                type: 'AUTH_BOOTSTRAP_ERROR',
                service: 'supabase',
                unavailable,
                message: dbError?.message,
                code: dbError?.code,
                details: dbError?.details
            });

            return res.status(unavailable ? 503 : 500).json({
                error: unavailable ? 'Service Unavailable' : 'Internal Server Error',
                message: unavailable
                    ? 'Database temporarily unavailable. Please try again shortly.'
                    : 'Authentication bootstrap failed'
            });
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', {
            type: 'AUTH_MIDDLEWARE_ERROR',
            name: error?.name,
            message: error?.message
        });
        if (error.cause) {
            console.error('Auth middleware error cause:', error.cause);
        }
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication service error'
        });
    }
};

/**
 * Ensure user exists in Supabase (create on first login)
 * Uses caching to avoid database lookups on every request
 */
async function ensureUserExists(auth) {
    const { userId, email } = auth;

    // Check cache first
    const cached = userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        auth.internalUserId = cached.internalUserId;
        return;
    }

    console.log('Auth: Looking up user in Supabase:', userId);

    // Try to find existing user
    const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id, email')
        .eq('clerk_id', userId)
        .maybeSingle();

    if (selectError) {
        console.error('Auth: Supabase select error:', selectError);
        throw selectError;
    }

    if (existingUser) {
        // Backfill a missing email from Clerk so reminder delivery can later
        // find a recipient. Failure here must never block authentication.
        if (!existingUser.email) {
            const clerkEmail = await fetchPrimaryEmailFromClerk(userId);
            if (clerkEmail) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ email: clerkEmail })
                    .eq('id', existingUser.id);

                if (updateError) {
                    console.error('Auth: Supabase email backfill error:', {
                        type: 'AUTH_EMAIL_BACKFILL_ERROR',
                        message: updateError.message,
                    });
                }
            }
        }

        userCache.set(userId, { internalUserId: existingUser.id, timestamp: Date.now() });
        auth.internalUserId = existingUser.id;
        return;
    }

    // User doesn't exist, create them. Prefer the JWT-derived email when the
    // session token included one; otherwise resolve it from Clerk so reminder
    // delivery can find a recipient.
    const resolvedEmail = email || await fetchPrimaryEmailFromClerk(userId);
    const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ clerk_id: userId, email: resolvedEmail || null })
        .select('id')
        .single();

    if (insertError) {
        // Handle race condition
        if (insertError.code === '23505') {
            const { data: raceUser } = await supabase
                .from('users')
                .select('id')
                .eq('clerk_id', userId)
                .single();
            if (raceUser) {
                userCache.set(userId, { internalUserId: raceUser.id, timestamp: Date.now() });
                auth.internalUserId = raceUser.id;
                return;
            }
        }
        throw insertError;
    }

    userCache.set(userId, { internalUserId: newUser.id, timestamp: Date.now() });
    auth.internalUserId = newUser.id;
}

/**
 * Fetch the user's primary email address from Clerk's Backend API.
 *
 * Returns null when the email cannot be resolved. Never throws: an email
 * lookup failure must not prevent authentication.
 *
 * Logs only safe identifiers and error information - never email addresses,
 * secrets, tokens, or service-role credentials.
 */
async function fetchPrimaryEmailFromClerk(clerkId) {
    try {
        const user = await clerkClient.users.getUser(clerkId);
        const emailAddresses = user?.emailAddresses || [];
        const primary = emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)
            || emailAddresses[0];

        return primary?.emailAddress || null;
    } catch (error) {
        console.error('Auth: Clerk email lookup failed:', {
            type: 'CLERK_EMAIL_LOOKUP_ERROR',
            clerkId,
            message: error?.message,
        });
        return null;
    }
}

module.exports = {
    ensureUserExists,
    fetchPrimaryEmailFromClerk,
    requireAuth,
};
