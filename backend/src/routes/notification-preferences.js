const express = require('express');
const { supabase } = require('../lib/supabase');
const { getReminderEmailConfig } = require('../lib/reminderEmail');
const { validate } = require('../middleware/validate');
const { updateNotificationPreferencesSchema } = require('../validation/notification-preferences-schemas');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .select('deadline_email_enabled')
            .eq('user_id', req.auth.internalUserId)
            .maybeSingle();

        if (error) throw error;
        return res.json({
            deadlineEmailEnabled: data?.deadline_email_enabled || false,
            emailDeliveryAvailable: getReminderEmailConfig().enabled,
        });
    } catch (error) {
        console.error('Notification preference lookup failed:', error.message);
        return res.status(500).json({ error: 'Failed to load notification preferences' });
    }
});

router.put('/', validate(updateNotificationPreferencesSchema), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .upsert({
                user_id: req.auth.internalUserId,
                deadline_email_enabled: req.body.deadlineEmailEnabled,
                updated_at: new Date().toISOString(),
            })
            .select('deadline_email_enabled')
            .single();

        if (error) throw error;
        return res.json({
            deadlineEmailEnabled: data.deadline_email_enabled,
            emailDeliveryAvailable: getReminderEmailConfig().enabled,
        });
    } catch (error) {
        console.error('Notification preference update failed:', error.message);
        return res.status(500).json({ error: 'Failed to update notification preferences' });
    }
});

module.exports = router;
