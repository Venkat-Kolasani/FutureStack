const express = require('express');
const { supabase } = require('../lib/supabase');
const { requireJobAdmin } = require('../middleware/requireJobAdmin');
const { validate } = require('../middleware/validate');
const { deadJobsQuerySchema } = require('../validation/jobs-schemas');

const router = express.Router();

router.get('/dead', requireJobAdmin, validate(deadJobsQuerySchema, 'query'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notification_jobs')
            .select('id, job_type, opportunity_id, reminder_type, deadline, attempts, max_attempts, last_error, created_at, updated_at')
            .eq('state', 'dead')
            .order('updated_at', { ascending: false })
            .limit(req.query.limit);

        if (error) throw error;
        return res.json({ jobs: data || [] });
    } catch (error) {
        console.error('Dead job listing failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch dead jobs' });
    }
});

module.exports = router;
