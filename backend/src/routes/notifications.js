const express = require('express');
const Joi = require('joi');
const { supabase } = require('../lib/supabase');
const { validate } = require('../middleware/validate');
const { notificationIdParamSchema } = require('../validation/jobs-schemas');

const router = express.Router();
const listNotificationsQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(25),
});

router.get('/', validate(listNotificationsQuerySchema, 'query'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_notifications')
            .select('id, opportunity_id, notification_type, deadline, title, body, read_at, created_at')
            .eq('user_id', req.auth.internalUserId)
            .order('created_at', { ascending: false })
            .limit(req.query.limit);

        if (error) throw error;
        return res.json({ notifications: data || [] });
    } catch (error) {
        console.error('Notification listing failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.patch('/:id/read', validate(notificationIdParamSchema, 'params'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', req.params.id)
            .eq('user_id', req.auth.internalUserId)
            .select('id, read_at')
            .single();

        if (error?.code === 'PGRST116') return res.status(404).json({ error: 'Notification not found' });
        if (error) throw error;
        return res.json(data);
    } catch (error) {
        console.error('Notification update failed:', error.message);
        return res.status(500).json({ error: 'Failed to update notification' });
    }
});

module.exports = router;
