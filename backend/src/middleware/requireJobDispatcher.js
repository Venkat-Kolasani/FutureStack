const { timingSafeEqual } = require('crypto');

function tokensMatch(expected, received) {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received || '');

    return expectedBuffer.length === receivedBuffer.length
        && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function requireJobDispatcher(req, res, next) {
    const expectedToken = process.env.JOB_DISPATCH_TOKEN;
    if (!expectedToken) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Background job dispatch is not configured.',
        });
    }

    const authorization = req.get('Authorization') || '';
    const suppliedToken = authorization.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';

    if (!tokensMatch(expectedToken, suppliedToken)) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid background job dispatcher token.',
        });
    }

    return next();
}

module.exports = { requireJobDispatcher };
