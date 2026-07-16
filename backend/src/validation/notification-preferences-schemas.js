const Joi = require('joi');

const updateNotificationPreferencesSchema = Joi.object({
    deadlineEmailEnabled: Joi.boolean().required(),
});

module.exports = { updateNotificationPreferencesSchema };
