const crypto = require('crypto');

const TOKEN_BYTES = 32;
const TOKEN_IV_BYTES = 12;
const PASSCODE_SALT_BYTES = 16;
const PASSCODE_ITERATIONS = 120000;
const PASSCODE_KEY_LENGTH = 32;
const TOKEN_HASH_ALGORITHM = 'sha256';
const TOKEN_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const PASSCODE_DIGEST = 'sha256';

const SHARE_FIELD_DEFAULTS = {
    status: true,
    rounds: true,
    rejectedRound: true,
    dateApplied: true,
    description: true,
    deadline: true,
    applicationLink: true,
};

function generateShareToken() {
    return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function hashToken(token) {
    return crypto.createHash(TOKEN_HASH_ALGORITHM).update(token).digest('hex');
}

function getTokenEncryptionKey() {
    const secret = process.env.SHARE_LINK_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
        return null;
    }

    return crypto.createHash('sha256').update(secret).digest();
}

function encryptShareToken(token) {
    const key = getTokenEncryptionKey();
    if (!key) {
        return {
            tokenCiphertext: null,
            tokenIv: null,
            tokenAuthTag: null,
        };
    }

    const iv = crypto.randomBytes(TOKEN_IV_BYTES);
    const cipher = crypto.createCipheriv(TOKEN_ENCRYPTION_ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        tokenCiphertext: ciphertext.toString('base64'),
        tokenIv: iv.toString('base64'),
        tokenAuthTag: authTag.toString('base64'),
    };
}

function decryptShareToken(share) {
    if (!share?.token_ciphertext || !share?.token_iv || !share?.token_auth_tag) {
        return null;
    }

    const key = getTokenEncryptionKey();
    if (!key) {
        return null;
    }

    try {
        const decipher = crypto.createDecipheriv(
            TOKEN_ENCRYPTION_ALGORITHM,
            key,
            Buffer.from(share.token_iv, 'base64')
        );
        decipher.setAuthTag(Buffer.from(share.token_auth_tag, 'base64'));
        return Buffer.concat([
            decipher.update(Buffer.from(share.token_ciphertext, 'base64')),
            decipher.final(),
        ]).toString('utf8');
    } catch (error) {
        console.warn('Unable to decrypt share token', { shareId: share.id, message: error.message });
        return null;
    }
}

function createPasscodeHash(passcode) {
    if (!passcode) {
        return { passcodeHash: null, passcodeSalt: null };
    }

    const passcodeSalt = crypto.randomBytes(PASSCODE_SALT_BYTES).toString('hex');
    const passcodeHash = crypto
        .pbkdf2Sync(passcode, passcodeSalt, PASSCODE_ITERATIONS, PASSCODE_KEY_LENGTH, PASSCODE_DIGEST)
        .toString('hex');

    return { passcodeHash, passcodeSalt };
}

function verifyPasscode(passcode, passcodeHash, passcodeSalt) {
    if (!passcodeHash || !passcodeSalt) {
        return true;
    }

    const candidate = crypto
        .pbkdf2Sync(passcode || '', passcodeSalt, PASSCODE_ITERATIONS, PASSCODE_KEY_LENGTH, PASSCODE_DIGEST)
        .toString('hex');

    return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(passcodeHash, 'hex'));
}

function resolveExpiresAt(expiry) {
    if (expiry === '24h') {
        return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    if (expiry === '7d') {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    return null;
}

function isShareExpired(share) {
    return Boolean(share?.expires_at && new Date(share.expires_at).getTime() <= Date.now());
}

function isShareUnavailable(share) {
    return !share || share.is_active === false || isShareExpired(share);
}

function normalizeFieldOptions(fields = {}) {
    return {
        status: fields.status !== false,
        rounds: fields.rounds !== false,
        rejectedRound: fields.rejectedRound !== false,
        dateApplied: fields.dateApplied !== false,
        description: fields.description !== false,
        deadline: fields.deadline !== false,
        applicationLink: fields.applicationLink !== false,
    };
}

function toPublicOpportunity(opportunity, fields, interviewRounds = null) {
    const item = {
        id: opportunity.id,
        title: opportunity.title,
        category: opportunity.category,
        campus_mode: opportunity.campus_mode || null,
    };

    if (fields.status) {
        item.status = opportunity.status || 'applied';
    }

    if (fields.description) {
        item.description = opportunity.description || null;
    }

    if (fields.deadline) {
        item.deadline = opportunity.deadline || null;
    }

    if (fields.applicationLink) {
        item.applicationLink = opportunity.link || null;
    }

    if (fields.rounds) {
        item.currentRoundNumber = opportunity.current_round_number || null;
    }

    if (fields.rejectedRound) {
        item.rejectedRoundNumber = opportunity.rejected_round_number || null;
    }

    if (fields.dateApplied) {
        item.dateApplied = opportunity.created_at || null;
    }

    if (fields.rounds && interviewRounds?.length) {
        item.interviewRounds = interviewRounds.map((round) => ({
            roundNumber: round.round_number,
            roundType: round.round_type,
            scheduledDate: round.scheduled_date || null,
            result: round.result,
        }));
    }

    return item;
}

function buildShareSnapshot({ opportunities, fields, expiry, selectedOpportunityIds, roundsByOpportunity = {} }) {
    const normalizedFields = normalizeFieldOptions(fields);
    const publicOpportunities = opportunities.map((opportunity) =>
        toPublicOpportunity(
            opportunity,
            normalizedFields,
            roundsByOpportunity[opportunity.id] || null
        )
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const statusCounts = publicOpportunities.reduce((counts, opportunity) => {
        const status = opportunity.status || 'hidden';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
    }, {});

    const categoryCounts = publicOpportunities.reduce((counts, opportunity) => {
        const category = opportunity.category || 'uncategorized';
        counts[category] = (counts[category] || 0) + 1;
        return counts;
    }, {});

    const opportunitiesWithLinks = publicOpportunities.filter((opportunity) => opportunity.applicationLink).length;
    const upcomingDeadlineCount = publicOpportunities.filter((opportunity) => {
        if (!opportunity.deadline) return false;
        const deadline = new Date(opportunity.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline >= today;
    }).length;
    const expiredDeadlineCount = publicOpportunities.filter((opportunity) => {
        if (!opportunity.deadline) return false;
        const deadline = new Date(opportunity.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline < today;
    }).length;

    const hasInterviewTimelines = publicOpportunities.some(
        (opportunity) => opportunity.interviewRounds?.length > 0
    );

    return {
        version: hasInterviewTimelines ? 3 : 2,
        generatedAt: new Date().toISOString(),
        shareType: 'placement_dashboard',
        options: {
            fields: normalizedFields,
            expiry,
            selectionMode: selectedOpportunityIds?.length ? 'specific' : 'all',
        },
        summary: {
            total: publicOpportunities.length,
            statusCounts,
            categoryCounts,
            selected: statusCounts.selected || 0,
            rejected: statusCounts.rejected || 0,
            ghosted: statusCounts.ghosted || 0,
            opportunitiesWithLinks,
            upcomingDeadlineCount,
            expiredDeadlineCount,
            inProgress:
                (statusCounts.applied || 0) +
                (statusCounts.interviewed || 0) +
                (statusCounts.shortlisted || 0),
        },
        opportunities: publicOpportunities,
    };
}

function sanitizeShareForOwner(share) {
    const snapshot = share.snapshot || {};
    const opportunities = snapshot.opportunities || [];
    const opportunityTitles = opportunities.map((opportunity) => opportunity.title).filter(Boolean);
    const token = decryptShareToken(share);
    return {
        id: share.id,
        snapshotType: share.snapshot_type,
        expiresAt: share.expires_at,
        isActive: share.is_active,
        viewCount: share.view_count || 0,
        createdAt: share.created_at,
        updatedAt: share.updated_at,
        hasPasscode: Boolean(share.passcode_hash),
        canCopy: Boolean(token),
        url: token ? `${getPublicAppUrl()}/share/${token}` : null,
        summary: snapshot.summary || { total: 0 },
        options: snapshot.options || {},
        opportunityTitles,
        primaryLabel:
            opportunityTitles.length === 1
                ? opportunityTitles[0]
                : opportunityTitles.length > 1
                  ? `${opportunityTitles.length} opportunities`
                  : null,
    };
}

function sanitizeShareForPublic(share) {
    return {
        id: share.id,
        snapshotType: share.snapshot_type,
        expiresAt: share.expires_at,
        viewCount: share.view_count || 0,
        createdAt: share.created_at,
        snapshot: share.snapshot,
        hasPasscode: Boolean(share.passcode_hash),
    };
}

function getPublicAppUrl() {
    const configuredUrl =
        process.env.PUBLIC_APP_URL ||
        process.env.FRONTEND_URL ||
        process.env.CLIENT_URL ||
        process.env.CORS_ORIGIN;

    if (configuredUrl) {
        return configuredUrl.split(',')[0].trim().replace(/\/$/, '');
    }

    return 'http://localhost:3000';
}

module.exports = {
    SHARE_FIELD_DEFAULTS,
    buildShareSnapshot,
    createPasscodeHash,
    decryptShareToken,
    encryptShareToken,
    generateShareToken,
    getPublicAppUrl,
    hashToken,
    isShareExpired,
    isShareUnavailable,
    resolveExpiresAt,
    sanitizeShareForOwner,
    sanitizeShareForPublic,
    verifyPasscode,
};
