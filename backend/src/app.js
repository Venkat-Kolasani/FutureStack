require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { randomUUID } = require('crypto');

const { requireAuth } = require('./middleware/auth');
const { supabase } = require('./lib/supabase');
const { getReminderEmailConfig } = require('./lib/reminderEmail');
const opportunitiesRoutes = require('./routes/opportunities');
const analyticsRoutes = require('./routes/analytics');
const documentsRoutes = require('./routes/documents');
const hackathonsRoutes = require('./routes/hackathons');
const interviewPrepRoutes = require('./routes/interview-prep');
const shareLinksRoutes = require('./routes/share-links');
const publicShareLinksRoutes = require('./routes/public-share-links');
const resumeCheckerRoutes = require('./routes/resume-checker');
const aiSettingsRoutes = require('./routes/ai-settings');
const internalJobsRoutes = require('./routes/internal-jobs');
const adminJobsRoutes = require('./routes/admin-jobs');
const notificationsRoutes = require('./routes/notifications');
const notificationPreferencesRoutes = require('./routes/notification-preferences');
const progressRoutes = require('./routes/progress');

const app = express();
const apiRouter = express.Router();
const legacyApiRouter = express.Router();
const API_V1_PREFIX = '/api/v1';
const LEGACY_API_SUNSET = 'Thu, 31 Dec 2026 23:59:59 GMT';

// =============================================================================
// Trust Proxy Configuration
// =============================================================================

app.set('trust proxy', 1);

const DEAD_JOB_READINESS_THRESHOLD = Number.parseInt(
    process.env.DEAD_JOB_READINESS_THRESHOLD || '0',
    10
);

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
    // Allow browser + Chrome extension clients on other origins to read API responses
    crossOriginResourcePolicy: { policy: 'cross-origin' },
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

const EXTENSION_CORS_ORIGIN = 'chrome-extension://ocadhiiiainnijhhimhmpagfdmfcnfmj';

const corsOrigins = new Set(
    process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
        : ['http://localhost:3000']
);
corsOrigins.add(EXTENSION_CORS_ORIGIN);

const corsOptions = {
    origin: [...corsOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());

app.use((req, res, next) => {
    const requestId = req.get('X-Request-Id');
    req.requestId = requestId && requestId.length <= 128 ? requestId : randomUUID();
    res.set('X-Request-Id', req.requestId);
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
        if (process.env.NODE_ENV === 'test') return;

        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'HTTP_REQUEST',
            requestId: req.requestId,
            method: req.method,
            path: req.baseUrl + req.path,
            statusCode: res.statusCode,
            durationMs: Number(durationMs.toFixed(2)),
        }));
    });

    next();
});

const authenticatedReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method !== 'GET',
    keyGenerator: (req) => {
        if (req.auth?.internalUserId) return `read:user:${req.auth.internalUserId}`;
        const ip = req.ips?.[0] || req.ip;
        return `read:ip:${ipKeyGenerator(ip)}`;
    },
    handler: (req, res) => {
        const resetTime = new Date(Date.now() + 60 * 1000);
        const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

        res.set('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
            error: 'Rate Limit Exceeded',
            code: 'READ_RATE_LIMIT',
            message: 'You have made too many read requests. Please wait before trying again.',
            retryAfter: resetTime.toISOString(),
            retryAfterSeconds,
            limit: 100,
            window: '1 minute',
        });
    }
});

const writeOperationsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method),
    keyGenerator: (req) => {
        if (req.auth?.internalUserId) return `write:user:${req.auth.internalUserId}`;
        const ip = req.ips?.[0] || req.ip;
        return `write:ip:${ipKeyGenerator(ip)}`;
    },
    handler: (req, res) => {
        const resetTime = new Date(Date.now() + 60 * 1000);
        const retryAfterSeconds = Math.ceil((resetTime - Date.now()) / 1000);

        res.set('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
            error: 'Write Rate Limit Exceeded',
            code: 'WRITE_RATE_LIMIT',
            message: 'You have made too many create, update, or delete requests. Please wait before trying again.',
            retryAfter: resetTime.toISOString(),
            retryAfterSeconds,
            limit: 20,
            window: '1 minute',
        });
    }
});

if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'test') return next();

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

apiRouter.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

apiRouter.get('/health/deps', async (req, res) => {
    const checks = {
        supabase: { status: 'ok' },
        aiTables: { status: 'ok' },
        reminderJobs: { status: 'ok', deadJobs: 0 },
    };

    try {
        const { error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Health dependency check failed:', {
                dependency: 'supabase',
                message: error.message,
            });
            checks.supabase = {
                status: 'down',
                message: 'Database dependency is unavailable.'
            };
        }
    } catch (error) {
        console.error('Health dependency check failed:', {
            dependency: 'supabase',
            message: error.message,
        });
        checks.supabase = {
            status: 'down',
            message: 'Database dependency is unavailable.'
        };
    }

    try {
        const { count, error } = await supabase
            .from('notification_jobs')
            .select('id', { count: 'exact', head: true })
            .eq('state', 'dead');

        if (error) {
            checks.reminderJobs = {
                status: 'missing',
                deadJobs: 0,
                message: error.message,
                hint: 'Apply the transactional reminder outbox migration before enabling dispatch.',
            };
        } else {
            const deadJobs = count || 0;
            checks.reminderJobs = {
                status: deadJobs > DEAD_JOB_READINESS_THRESHOLD ? 'degraded' : 'ok',
                deadJobs,
                threshold: DEAD_JOB_READINESS_THRESHOLD,
            };
        }
    } catch (error) {
        checks.reminderJobs = {
            status: 'missing',
            deadJobs: 0,
            message: error.message,
            hint: 'Apply the transactional reminder outbox migration before enabling dispatch.',
        };
    }

    try {
        const { error } = await supabase
            .from('user_ai_settings')
            .select('user_id')
            .limit(1);

        if (error) {
            checks.aiTables = {
                status: 'missing',
                message: error.message,
                hint: 'Run docs/ai-tables-setup.sql in Supabase SQL Editor or npm run db:migrate:ai',
            };
        }
    } catch (error) {
        checks.aiTables = {
            status: 'missing',
            message: error.message,
            hint: 'Run docs/ai-tables-setup.sql in Supabase SQL Editor or npm run db:migrate:ai',
        };
    }

    checks.reminderEmail = {
        status: 'ok',
        enabled: getReminderEmailConfig().enabled,
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'ok');

    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        checks
    });
});

apiRouter.use('/opportunities', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, opportunitiesRoutes);
apiRouter.use('/analytics', requireAuth, authenticatedReadLimiter, analyticsRoutes);
apiRouter.use('/documents', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, documentsRoutes);
apiRouter.use('/hackathons', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, hackathonsRoutes);
apiRouter.use('/interview-prep', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, interviewPrepRoutes);
apiRouter.use('/share-links', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, shareLinksRoutes);
apiRouter.use('/public/share-links', publicShareLinksRoutes);
apiRouter.use('/documents/:id/ai-check', requireAuth, authenticatedReadLimiter, resumeCheckerRoutes);
apiRouter.use('/ai-settings', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, aiSettingsRoutes);
apiRouter.use('/notifications', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, notificationsRoutes);
apiRouter.use('/notification-preferences', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, notificationPreferencesRoutes);
apiRouter.use('/progress', requireAuth, authenticatedReadLimiter, writeOperationsLimiter, progressRoutes);
apiRouter.use('/admin/jobs', requireAuth, authenticatedReadLimiter, adminJobsRoutes);
apiRouter.use('/internal/jobs', internalJobsRoutes);

apiRouter.get('/me', requireAuth, authenticatedReadLimiter, (req, res) => {
    res.json({
        userId: req.auth.userId,
        internalUserId: req.auth.internalUserId,
        email: req.auth.email
    });
});

app.use(API_V1_PREFIX, apiRouter);

legacyApiRouter.use((req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', LEGACY_API_SUNSET);
    res.set('Link', `<${API_V1_PREFIX}${req.originalUrl.replace(/^\/api/, '')}>; rel="successor-version"`);
    next();
});
legacyApiRouter.use(apiRouter);
app.use('/api', legacyApiRouter);

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
