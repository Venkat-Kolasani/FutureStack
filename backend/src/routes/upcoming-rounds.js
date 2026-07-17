const express = require('express');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { upcomingRoundsQuerySchema } = require('../validation/rounds-schemas');

const router = express.Router();

const UPCOMING_ROUNDS_MAX_RESULTS = 200;

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
    });

    if (unavailable) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database is currently unavailable. Please try again in a moment.',
        });
    }

    return res.status(500).json({ error: defaultMessage });
};

/**
 * GET /api/opportunities/rounds/upcoming?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Pending interview rounds with scheduled dates in range (internships only).
 */
router.get('/upcoming', validate(upcomingRoundsQuerySchema, 'query'), async (req, res) => {
    try {
        const userId = req.auth.internalUserId;
        const { from, to } = req.query;

        const { data, error } = await supabase
            .from('opportunity_rounds')
            .select(
                'id, opportunity_id, round_number, round_type, scheduled_date, scheduled_time, result, opportunities!inner(id, title, category)'
            )
            .eq('user_id', userId)
            .eq('result', 'pending')
            .eq('opportunities.category', 'internship')
            .not('scheduled_date', 'is', null)
            .gte('scheduled_date', from)
            .lte('scheduled_date', to)
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true, nullsFirst: false })
            .order('round_number', { ascending: true })
            .limit(UPCOMING_ROUNDS_MAX_RESULTS);

        if (error) throw error;

        const items = (data || []).map((row) => ({
            id: row.id,
            opportunityId: row.opportunity_id,
            opportunityTitle: row.opportunities?.title || 'Internship',
            roundNumber: row.round_number,
            roundType: row.round_type,
            scheduledDate: row.scheduled_date,
            scheduledTime: row.scheduled_time,
            result: row.result,
        }));

        res.json(items);
    } catch (error) {
        return handleRouteError(res, 'LIST_UPCOMING_ROUNDS', error, 'Failed to fetch upcoming interview rounds');
    }
});

module.exports = router;
