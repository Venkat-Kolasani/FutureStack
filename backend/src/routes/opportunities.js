const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const {
    createOpportunitySchema,
    updateOpportunitySchema,
    idParamSchema,
    opportunityListQuerySchema,
} = require('../validation/schemas');
const opportunityRoundsRouter = require('./opportunity-rounds');
const upcomingRoundsRouter = require('./upcoming-rounds');

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
 * Note: Avoids logging user-supplied content (titles, descriptions) to prevent
 * sensitive data exposure in logs. Only logs action type, user ID, resource ID, and metadata.
 * Note: Custom error messages from Joi schemas (defined in schemas.js) will be properly
 * propagated through the validation middleware to the client.
 */
function logAudit(action, userId, resourceId = null, outcome = 'success', details = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        action,
        userId,
        resourceId,
        outcome, // success or failure
        details // Metadata only, no user content
    }));
}

function encodeCursor(opportunity) {
    return Buffer.from(JSON.stringify({
        createdAt: new Date(opportunity.created_at).toISOString(),
        id: opportunity.id,
    })).toString('base64url');
}

function decodeCursor(cursor) {
    try {
        const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
        const createdAt = new Date(parsed.createdAt);

        if (
            !parsed || typeof parsed.id !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.id) ||
            Number.isNaN(createdAt.getTime()) ||
            createdAt.toISOString() !== parsed.createdAt
        ) {
            return null;
        }

        return { createdAt: parsed.createdAt, id: parsed.id };
    } catch {
        return null;
    }
}

/**
 * A collaboration invite grants access only to a hackathon workspace, never to
 * another user's general opportunity list. The membership lookup happens after
 * the owner-scoped read fails, so the common path stays a single indexed query.
 */
async function getCollaboratorHackathonOpportunity(opportunityId, userId) {
    const { data: membership, error: membershipError } = await supabase
        .from('team_memberships')
        .select('team_id, hackathon_teams!inner(opportunity_id)')
        .eq('user_id', userId)
        .eq('hackathon_teams.opportunity_id', opportunityId)
        .single();

    if (membershipError || !membership) {
        return { data: null, error: membershipError };
    }

    const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', opportunityId)
        .eq('category', 'hackathon')
        .single();

    return { data, error };
}

/**
 * GET /api/opportunities
 * Get all opportunities for the authenticated user
 */
router.get('/', validate(opportunityListQuerySchema, 'query'), async (req, res) => {
    try {
        const { limit, cursor, status, category } = req.query;
        const decodedCursor = cursor ? decodeCursor(cursor) : null;

        if (cursor && !decodedCursor) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'cursor must be a valid opportunity cursor',
                details: [{ field: 'cursor', message: 'cursor is invalid or malformed' }],
            });
        }

        let query = supabase
            .from('opportunities')
            .select('*')
            .eq('user_id', req.auth.internalUserId);

        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);
        if (decodedCursor) {
            query = query.or(
                `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.id})`
            );
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(limit + 1);

        if (error) throw error;

        const rows = data || [];
        const hasNextPage = rows.length > limit;
        const items = hasNextPage ? rows.slice(0, limit) : rows;
        const nextCursor = hasNextPage ? encodeCursor(items[items.length - 1]) : null;

        res.json({ items, nextCursor });
    } catch (error) {
        return handleRouteError(res, 'FETCH_OPPORTUNITIES', error, 'Failed to fetch opportunities');
    }
});

// Upcoming rounds across all internships (before /:opportunityId/rounds)
router.use('/rounds', upcomingRoundsRouter);

// Interview rounds per opportunity (must be registered before /:id to avoid route shadowing)
router.use('/:opportunityId/rounds', opportunityRoundsRouter);

/**
 * GET /api/opportunities/:id
 * Get a single opportunity by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('opportunities')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .single();

        if (!error) return res.json(data);

        if (error.code !== 'PGRST116') throw error;

        const collaboratorResult = await getCollaboratorHackathonOpportunity(
            id,
            req.auth.internalUserId
        );

        if (!collaboratorResult.data) {
            if (collaboratorResult.error?.code === '42P01') {
                return res.status(503).json({
                    error: 'Collaboration tables are not configured',
                    code: 'TABLES_NOT_EXIST',
                });
            }
            if (collaboratorResult.error && collaboratorResult.error.code !== 'PGRST116') {
                throw collaboratorResult.error;
            }
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        return res.json(collaboratorResult.data);
    } catch (error) {
        return handleRouteError(res, 'FETCH_OPPORTUNITY', error, 'Failed to fetch opportunity');
    }
});

/**
 * POST /api/opportunities
 * Create a new opportunity
 */
router.post('/', validate(createOpportunitySchema), async (req, res) => {
    try {
        const { title, description, link, deadline, category, status, notes, campus_mode } = req.body;

        const { data, error } = await supabase
            .from('opportunities')
            .insert({
                user_id: req.auth.internalUserId,
                title,
                description: description || null,
                link: link || null,
                deadline: deadline || null,
                category: category || null,
                status: status || 'applied',
                notes: notes || null,
                campus_mode: campus_mode || null
            })
            .select()
            .single();

        if (error) throw error;

        // Audit log (metadata only, no user content)
        logAudit('CREATE_OPPORTUNITY', req.auth.internalUserId, data.id, 'success', {
            category: data.category
        });

        res.status(201).json(data);
    } catch (error) {
        return handleRouteError(res, 'CREATE_OPPORTUNITY', error, 'Failed to create opportunity');
    }
});

/**
 * Shared handler for PUT and PATCH operations
 */
const updateHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, link, deadline, category, status, notes, campus_mode } = req.body;

        // Build update object with only provided fields
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (link !== undefined) updateData.link = link;
        if (deadline !== undefined) updateData.deadline = deadline;
        if (category !== undefined) updateData.category = category;
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (campus_mode !== undefined) updateData.campus_mode = campus_mode || null;

        const { data, error } = await supabase
            .from('opportunities')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Opportunity not found' });
            }
            throw error;
        }

        // Audit log (metadata only, no user content)
        logAudit('UPDATE_OPPORTUNITY', req.auth.internalUserId, id, 'success', {
            updatedFields: Object.keys(updateData),
            fieldCount: Object.keys(updateData).length
        });

        res.json(data);
    } catch (error) {
        return handleRouteError(res, 'UPDATE_OPPORTUNITY', error, 'Failed to update opportunity');
    }
};

/**
 * PUT /api/opportunities/:id
 * Update an existing opportunity
 */
router.put('/:id', validate(idParamSchema, 'params'), validate(updateOpportunitySchema), updateHandler);

/**
 * PATCH /api/opportunities/:id
 * Partial update (same as PUT for compatibility)
 */
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateOpportunitySchema), updateHandler);

/**
 * DELETE /api/opportunities/:id
 * Delete an opportunity
 */
router.delete('/:id', validate(idParamSchema, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const { error, count } = await supabase
            .from('opportunities')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('user_id', req.auth.internalUserId);

        if (error) throw error;

        if (count === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        // Audit log
        logAudit('DELETE_OPPORTUNITY', req.auth.internalUserId, id, 'success');

        res.json({ success: true, message: 'Opportunity deleted' });
    } catch (error) {
        return handleRouteError(res, 'DELETE_OPPORTUNITY', error, 'Failed to delete opportunity');
    }
});

module.exports = router;
