function requireJobAdmin(req, res, next) {
    const adminIds = new Set(
        (process.env.JOB_ADMIN_USER_IDS || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    );

    if (!adminIds.has(req.auth?.internalUserId)) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Job administration access is required.',
        });
    }

    return next();
}

module.exports = { requireJobAdmin };
