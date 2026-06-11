const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { updateProfileSchema } = require('../validation/profile-schemas');

const router = express.Router();

const isDatabaseUnavailableError = (error) => {
    const msg = String(error?.message || '').toLowerCase();
    return msg.includes('fetch failed') || msg.includes('network');
};

const handleRouteError = (res, action, error, defaultMessage) => {
    const unavailable = isDatabaseUnavailableError(error);

    console.error(`${action} error:`, {
        type: 'ROUTE_ERROR',
        service: 'supabase',
        unavailable,
        message: error?.message,
        code: error?.code,
        details: error?.details
    });

    if (unavailable) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database is currently unavailable. Please try again in a moment.'
        });
    }

    return res.status(500).json({ error: defaultMessage });
};

/**
 * Audit logging helper
 * Note: Avoids logging user-supplied content to prevent sensitive data exposure.
 */
function logAudit(action, userId, outcome = 'success', details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        userId,
        outcome,
        details
    }));
}

/**
 * GET /api/profile
 * Get the authenticated user's profile
 * Creates an empty profile row on first access if it doesn't exist
 */
router.get('/', async (req, res) => {
    try {
        // Try to fetch existing profile
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', req.auth.internalUserId)
            .maybeSingle();

        if (error) throw error;

        // If no profile exists, create one automatically
        if (!data) {
            const { data: newProfile, error: insertError } = await supabase
                .from('user_profiles')
                .insert({ user_id: req.auth.internalUserId })
                .select()
                .single();

            if (insertError) throw insertError;

            logAudit('GET_PROFILE', req.auth.internalUserId, 'created', {
                profileId: newProfile.id
            });

            return res.json(newProfile);
        }

        res.json(data);
    } catch (error) {
        return handleRouteError(res, 'GET_PROFILE', error, 'Failed to fetch profile');
    }
});

/**
 * PATCH /api/profile
 * Update the authenticated user's profile
 * Partial updates are supported - only provided fields will be updated
 */
router.patch('/', validate(updateProfileSchema), async (req, res) => {
    try {
        const {
            bio,
            avatar_url,
            college,
            degree,
            graduation_year,
            skills,
            github_url,
            linkedin_url,
            portfolio_url
        } = req.body;

        // Build update object with only provided fields
        const updateData = {};
        if (bio !== undefined) updateData.bio = bio || null;
        if (avatar_url !== undefined) updateData.avatar_url = avatar_url || null;
        if (college !== undefined) updateData.college = college || null;
        if (degree !== undefined) updateData.degree = degree || null;
        if (graduation_year !== undefined) updateData.graduation_year = graduation_year || null;
        if (skills !== undefined) updateData.skills = skills || null;
        if (github_url !== undefined) updateData.github_url = github_url || null;
        if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url || null;
        if (portfolio_url !== undefined) updateData.portfolio_url = portfolio_url || null;

        // Upsert: update if exists, insert if not (using DO UPDATE on conflict)
        const { data, error } = await supabase
            .from('user_profiles')
            .upsert(
                { user_id: req.auth.internalUserId, ...updateData },
                { onConflict: 'user_id' }
            )
            .select()
            .single();

        if (error) throw error;

        logAudit('UPDATE_PROFILE', req.auth.internalUserId, 'success', {
            updatedFields: Object.keys(updateData),
            fieldCount: Object.keys(updateData).length
        });

        res.json(data);
    } catch (error) {
        return handleRouteError(res, 'UPDATE_PROFILE', error, 'Failed to update profile');
    }
});

module.exports = router;