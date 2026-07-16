'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const windowMs = parseInt(process.env.AI_CHECK_RATE_LIMIT_WINDOW_MS || String(60 * 1000), 10);
const defaultMax = '5';
const max = parseInt(process.env.AI_CHECK_RATE_LIMIT_MAX || defaultMax, 10);

/**
 * Rate limit for POST /api/documents/:id/ai-check only (LLM pipeline runs).
 * GET (load saved results) is intentionally excluded.
 * Keys by authenticated user when available, otherwise IP.
 */
const aiCheckRunLimiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        if (req.auth?.internalUserId) {
            return `ai-check:user:${req.auth.internalUserId}`;
        }
        const ip = req.ips?.length > 0 ? req.ips[0] : req.ip;
        return `ai-check:ip:${ipKeyGenerator(ip)}`;
    },
    handler: (req, res) => {
        const resetTime = req.rateLimit?.resetTime
            ? new Date(req.rateLimit.resetTime)
            : new Date(Date.now() + windowMs);
        const retryAfterSeconds = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
        res.set('Retry-After', retryAfterSeconds.toString());
        res.status(429).json({
            error: 'AI Rate Limit Exceeded',
            code: 'AI_CHECK_RATE_LIMIT',
            message: `You have reached the limit for AI resume checks (${max} per ${Math.round(windowMs / 60000)} minutes). Please wait before running another analysis.`,
            retryAfter: resetTime.toISOString(),
            retryAfterSeconds,
            limit: max,
            window: `${Math.round(windowMs / 60000)} minutes`,
        });
    },
});

module.exports = { aiCheckRunLimiter };
