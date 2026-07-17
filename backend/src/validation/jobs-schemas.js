const Joi = require('joi');

const dispatchJobsSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
});

const deadJobsQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(25),
});

const notificationIdParamSchema = Joi.object({
    id: Joi.string().uuid().required(),
});

module.exports = { dispatchJobsSchema, deadJobsQuerySchema, notificationIdParamSchema };
