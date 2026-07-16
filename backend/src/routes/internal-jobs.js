const express = require('express');
const { supabase } = require('../lib/supabase');
const { dispatchReminderJobs } = require('../lib/reminderJobs');
const { requireJobDispatcher } = require('../middleware/requireJobDispatcher');
const { validate } = require('../middleware/validate');
const { dispatchJobsSchema } = require('../validation/jobs-schemas');

const router = express.Router();

router.post('/dispatch', requireJobDispatcher, validate(dispatchJobsSchema), async (req, res) => {
    try {
        const summary = await dispatchReminderJobs(supabase, { limit: req.body.limit });
        return res.json({ status: 'ok', ...summary });
    } catch (error) {
        console.error('Reminder dispatch failed:', error.message);
        return res.status(500).json({
            error: 'Reminder Dispatch Failed',
            message: 'Unable to dispatch reminder jobs.',
        });
    }
});

module.exports = router;
