require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const { requireAuth } = require('./middleware/auth');
const { supabase } = require('./lib/supabase');
const opportunitiesRoutes = require('./routes/opportunities');
const analyticsRoutes = require('./routes/analytics');
const documentsRoutes = require('./routes/documents');
const hackathonsRoutes = require('./routes/hackathons');
const profileRoutes = require('./routes/profile');

const app = express();

// =============================================================================
// Trust Proxy Configuration
// =============================================================================

app.set('trust proxy', 1);

// =============================================================================
// Middleware
// =============================================================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
}));

const corsOptions = {
    origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
        : ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/api/health',
    handler: (req, res) => {
        const resetTime = new Date(Date.now() + 15 * 60 * 1000);
        const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

        res.set('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: 'You have made too many requests. This is to prevent abuse and ensure fair usage for all users.',
            retryAfter: resetTime.toISOString(),
            retryAfterSeconds,
            limit: 2000,
            window: '15 minutes',
            note: 'If you are on a shared network, multiple users may be affected. Please wait and try again.'
        });
    }
});

const writeOperationsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
    handler: (req, res) => {
        const resetTime = new Date(Date.now() + 15 * 60 * 1000);
        const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

        res.set('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
            error: 'Write Rate Limit Exceeded',
            message: 'You have made too many create/update/delete operations. This limit helps prevent abuse while allowing you to add multiple opportunities. Please wait a moment and try again.',
            retryAfter: resetTime.toISOString(),
            retryAfterSeconds,
            limit: 1500,
            window: '15 minutes',
            note: 'If you are on a shared network (hostel, campus), this limit is shared among all users. You can add up to 1500 opportunities collectively per 15 minutes.'
        });
    }
});

app.use('/api/', generalLimiter);

if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const clientIp = req.ips && req.ips.length > 0 ? req.ips[0] : req.ip;

        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'REQUEST',
            method: req.method,
            path: req.path,
            ip: clientIp
        }));

        const originalJson = res.json.bind(res);
        res.json = function (body) {
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                type: 'RESPONSE',
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                success: res.statusCode >= 200 && res.statusCode < 300,
                ip: clientIp
            }));
            return originalJson(body);
        };
    }
    next();
});

// =============================================================================
// Routes
// =============================================================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health/deps', async (req, res) => {
    const checks = {
        supabase: { status: 'ok' }
    };

    try {
        const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            checks.supabase = {
                status: 'down',
                message: error.message
            };
        }
    } catch (error) {
        checks.supabase = {
            status: 'down',
            message: error.message
        };
    }

    const allHealthy = Object.values(checks).every(check => check.status === 'ok');

    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        checks
    });
});

app.use('/api/opportunities', requireAuth, writeOperationsLimiter, opportunitiesRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/documents', requireAuth, writeOperationsLimiter, documentsRoutes);
app.use('/api/hackathons', requireAuth, writeOperationsLimiter, hackathonsRoutes);
app.use('/api/profile', requireAuth, writeOperationsLimiter, profileRoutes);

app.get('/api/me', requireAuth, (req, res) => {
    res.json({
        userId: req.auth.userId,
        internalUserId: req.auth.internalUserId,
        email: req.auth.email
    });
});

// =============================================================================
// Error Handling
// =============================================================================

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: `Route ${req.path} not found` });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

module.exports = app;
