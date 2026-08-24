const Joi = require('joi');

const TEMPLATE_TYPES = ['leetcode', 'dev', 'system_design', 'mock', 'reading', 'custom'];
const MOODS = ['easy', 'moderate', 'hard'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDate = Joi.string().pattern(ISO_DATE).messages({
    'string.pattern.base': 'Date must be YYYY-MM-DD',
});

const uuidParam = (field, label) => Joi.object({
    [field]: Joi.string().uuid().required().messages({
        'string.uuid': `${label} must be a valid UUID`,
        'any.required': `${label} is required`,
    }),
});

const createTrackSchema = Joi.object({
    name: Joi.string().trim().min(1).max(80).required(),
    templateType: Joi.string().valid(...TEMPLATE_TYPES).required(),
});

const updateTrackSchema = Joi.object({
    name: Joi.string().trim().min(1).max(80),
    isActive: Joi.boolean(),
}).min(1);

const metadataSchema = Joi.object()
    .pattern(
        Joi.string().max(40),
        Joi.alternatives().try(
            Joi.string().max(2000).allow(''),
            Joi.number(),
            Joi.boolean(),
            Joi.valid(null)
        )
    )
    .max(20)
    .default({});

const createLogSchema = Joi.object({
    trackId: Joi.string().uuid().required(),
    logDate: isoDate.required(),
    didLog: Joi.boolean().required(),
    whatDidYouDo: Joi.when('didLog', {
        is: true,
        then: Joi.string().trim().min(1).max(4000).required(),
        otherwise: Joi.string().trim().max(4000).allow('', null).optional(),
    }),
    whatDidYouLearn: Joi.string().trim().max(4000).allow('', null).optional(),
    metadata: metadataSchema,
    mood: Joi.string().valid(...MOODS).allow(null).optional(),
});

const updateLogSchema = Joi.object({
    didLog: Joi.boolean(),
    whatDidYouDo: Joi.string().trim().max(4000).allow('', null),
    whatDidYouLearn: Joi.string().trim().max(4000).allow('', null),
    metadata: metadataSchema,
    mood: Joi.string().valid(...MOODS).allow(null),
    logDate: isoDate,
}).min(1);

const heatmapQuerySchema = Joi.object({
    end: isoDate.optional(),
});

const dateParamSchema = Joi.object({
    date: isoDate.required(),
});

const trackIdParamSchema = uuidParam('trackId', 'Track ID');
const idParamSchema = uuidParam('id', 'ID');

module.exports = {
    TEMPLATE_TYPES,
    MOODS,
    createTrackSchema,
    updateTrackSchema,
    createLogSchema,
    updateLogSchema,
    heatmapQuerySchema,
    dateParamSchema,
    trackIdParamSchema,
    idParamSchema,
};
