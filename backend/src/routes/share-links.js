const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const {
    buildShareSnapshot,
    createPasscodeHash,
    encryptShareToken,
    generateShareToken,
    getPublicAppUrl,
    hashToken,
    resolveExpiresAt,
    sanitizeShareForOwner,
} = require('../lib/shareLinks');
const {
    createShareLinkSchema,
    shareIdParamSchema,
} = require('../validation/share-links-schemas');

const router = express.Router();

const OPPORTUNITY_SHARE_FIELDS =
    'id, title, description, link, deadline, status, category, campus_mode, created_at, rejected_round_number, current_round_number';

const OWNER_SHARE_FIELDS =
    'id, snapshot, snapshot_type, expires_at, is_active, view_count, passcode_hash, token_ciphertext, token_iv, token_auth_tag, created_at, updated_at';

function logShareAudit(action, userId, shareId = null, outcome = 'success', details = {}) {
    console.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        userId,
        resourceId: shareId,
        outcome,
        details,
    }));
}

function handleShareError(res, action, error, defaultMessage) {
    console.error(`${action} error:`, {
        type: 'ROUTE_ERROR',
        service: 'share-links',
        message: error?.message,
        code: error?.code,
        details: error?.details,
    });

    return res.status(500).json({ error: defaultMessage });
}

/**
 * GET /api/share-links
 * List share links for the authenticated user. Raw tokens are intentionally not
 * returned; the owner only sees metadata for management and revoke actions.
 */
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('share_links')
            .select(OWNER_SHARE_FIELDS)
            .eq('user_id', req.auth.internalUserId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json((data || []).map(sanitizeShareForOwner));
    } catch (error) {
        return handleShareError(res, 'LIST_SHARE_LINKS', error, 'Failed to fetch share links');
    }
});

/**
 * POST /api/share-links
 * Create a share link and return the raw URL once.
 */
router.post('/', validate(createShareLinkSchema), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { opportunityIds, fields, expiry, passcode } = req.body;

        let query = supabase
            .from('opportunities')
            .select(OPPORTUNITY_SHARE_FIELDS)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (opportunityIds?.length) {
            query = query.in('id', opportunityIds);
        }

        const { data: opportunities, error: opportunitiesError } = await query;
        if (opportunitiesError) throw opportunitiesError;

        const opportunityList = opportunities || [];
        const internshipIds = opportunityList
            .filter((opp) => opp.category === 'internship')
            .map((opp) => opp.id);

        let roundsByOpportunity = {};
        if (internshipIds.length > 0 && fields?.rounds !== false) {
            const { data: rounds, error: roundsError } = await supabase
                .from('opportunity_rounds')
                .select('opportunity_id, round_number, round_type, scheduled_date, result')
                .eq('user_id', userId)
                .in('opportunity_id', internshipIds)
                .order('round_number', { ascending: true });

            if (roundsError) throw roundsError;

            for (const round of rounds || []) {
                if (!roundsByOpportunity[round.opportunity_id]) {
                    roundsByOpportunity[round.opportunity_id] = [];
                }
                roundsByOpportunity[round.opportunity_id].push(round);
            }
        }

        if (opportunityIds?.length) {
            const foundIds = new Set((opportunities || []).map((opportunity) => opportunity.id));
            const missingIds = opportunityIds.filter((id) => !foundIds.has(id));
            if (missingIds.length > 0) {
                return res.status(400).json({
                    error: 'Invalid opportunity selection',
                    message: 'One or more selected opportunities were not found.',
                });
            }
        }

        const snapshot = buildShareSnapshot({
            opportunities: opportunityList,
            fields,
            expiry,
            selectedOpportunityIds: opportunityIds || [],
            roundsByOpportunity,
        });

        const token = generateShareToken();
        const tokenHash = hashToken(token);
        const { tokenCiphertext, tokenIv, tokenAuthTag } = encryptShareToken(token);
        const { passcodeHash, passcodeSalt } = createPasscodeHash(passcode);

        const { data: share, error: insertError } = await supabase
            .from('share_links')
            .insert({
                user_id: userId,
                token_hash: tokenHash,
                token_ciphertext: tokenCiphertext,
                token_iv: tokenIv,
                token_auth_tag: tokenAuthTag,
                snapshot,
                snapshot_type: 'frozen',
                expires_at: resolveExpiresAt(expiry),
                is_active: true,
                passcode_hash: passcodeHash,
                passcode_salt: passcodeSalt,
            })
            .select(OWNER_SHARE_FIELDS)
            .single();

        if (insertError) throw insertError;

        logShareAudit('CREATE_SHARE_LINK', userId, share.id, 'success', {
            opportunityCount: snapshot.summary.total,
            expiry,
            hasPasscode: Boolean(passcodeHash),
        });

        res.status(201).json({
            ...sanitizeShareForOwner(share),
            token,
            url: `${getPublicAppUrl()}/share/${token}`,
        });
    } catch (error) {
        return handleShareError(res, 'CREATE_SHARE_LINK', error, 'Failed to create share link');
    }
});

/**
 * DELETE /api/share-links/:id
 * Revoke a share link immediately.
 */
router.delete('/:id', validate(shareIdParamSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('share_links')
            .update({ is_active: false })
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .select(OWNER_SHARE_FIELDS)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Share link not found' });
            }
            throw error;
        }

        logShareAudit('REVOKE_SHARE_LINK', req.auth.internalUserId, id);

        res.json(sanitizeShareForOwner(data));
    } catch (error) {
        return handleShareError(res, 'REVOKE_SHARE_LINK', error, 'Failed to revoke share link');
    }
});

module.exports = router;
