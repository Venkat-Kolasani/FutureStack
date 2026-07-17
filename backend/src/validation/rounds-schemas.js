const Joi = require('joi');

const ROUND_TYPES = [
    'resume_shortlisted',
    'oa',
    'assignment',
    'technical_assignment',
    'technical',
    'hr',
    'group_discussion',
    'managerial',
    'final',
    'other'
];

const ROUND_RESULTS = ['pending', 'cleared', 'rejected', 'skipped'];

const createRoundSchema = Joi.object({
    round_number: Joi.number()
        .integer()
        .min(1)
        .optional()
        .messages({
            'number.min': 'Round number must be at least 1'
        }),

    round_type: Joi.string()
        .valid(...ROUND_TYPES)
        .required()
        .messages({
            'any.only': `Round type must be one of: ${ROUND_TYPES.join(', ')}`,
            'any.required': 'Round type is required'
        }),

    scheduled_date: Joi.date()
        .iso()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Scheduled date must be a valid ISO date'
        }),

    scheduled_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
        .allow(null, '')
        .optional()
        .messages({
            'string.pattern.base': 'Scheduled time must use 24-hour HH:MM format'
        }),

    result: Joi.string()
        .valid(...ROUND_RESULTS)
        .default('pending')
        .optional()
        .messages({
            'any.only': `Result must be one of: ${ROUND_RESULTS.join(', ')}`
        }),

    notes: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Notes cannot exceed 5000 characters'
        })
});

const updateRoundSchema = Joi.object({
    round_type: Joi.string()
        .valid(...ROUND_TYPES)
        .optional()
        .messages({
            'any.only': `Round type must be one of: ${ROUND_TYPES.join(', ')}`
        }),

    scheduled_date: Joi.date()
        .iso()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Scheduled date must be a valid ISO date'
        }),

    scheduled_time: Joi.string()
        .pattern(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
        .allow(null, '')
        .optional()
        .messages({
            'string.pattern.base': 'Scheduled time must use 24-hour HH:MM format'
        }),

    result: Joi.string()
        .valid(...ROUND_RESULTS)
        .optional()
        .messages({
            'any.only': `Result must be one of: ${ROUND_RESULTS.join(', ')}`
        }),

    notes: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Notes cannot exceed 5000 characters'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

const opportunityRoundParamsSchema = Joi.object({
    opportunityId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'Invalid opportunity ID format',
            'any.required': 'Opportunity ID is required'
        }),
    roundId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'Invalid round ID format',
            'any.required': 'Round ID is required'
        })
});

const opportunityIdOnlyParamsSchema = Joi.object({
    opportunityId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'Invalid opportunity ID format',
            'any.required': 'Opportunity ID is required'
        })
});

const UPCOMING_ROUNDS_MAX_RANGE_DAYS = 366;

const dateOnlyString = Joi.string().custom((value, helpers) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return helpers.error('string.pattern.base');
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return helpers.error('date.invalid');
    }

    return value;
});

const upcomingRoundsQuerySchema = Joi.object({
    from: dateOnlyString.required().messages({
        'string.pattern.base': 'from must be a valid ISO date (YYYY-MM-DD)',
        'date.invalid': 'from must be a valid calendar date',
        'any.required': 'from query parameter is required'
    }),
    to: dateOnlyString.required().messages({
        'string.pattern.base': 'to must be a valid ISO date (YYYY-MM-DD)',
        'date.invalid': 'to must be a valid calendar date',
        'any.required': 'to query parameter is required'
    })
}).custom((value, helpers) => {
    if (value.to < value.from) {
        return helpers.error('object.dateRange');
    }

    const [fromYear, fromMonth, fromDay] = value.from.split('-').map(Number);
    const [toYear, toMonth, toDay] = value.to.split('-').map(Number);
    const fromMs = Date.UTC(fromYear, fromMonth - 1, fromDay);
    const toMs = Date.UTC(toYear, toMonth - 1, toDay);
    const rangeDays = Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));

    if (rangeDays > UPCOMING_ROUNDS_MAX_RANGE_DAYS) {
        return helpers.error('object.dateRangeTooWide');
    }

    return value;
}).messages({
    'object.dateRange': 'to must be on or after from',
    'object.dateRangeTooWide': `date range cannot exceed ${UPCOMING_ROUNDS_MAX_RANGE_DAYS} days`
});

module.exports = {
    ROUND_TYPES,
    ROUND_RESULTS,
    createRoundSchema,
    updateRoundSchema,
    opportunityRoundParamsSchema,
    opportunityIdOnlyParamsSchema,
    upcomingRoundsQuerySchema,
    UPCOMING_ROUNDS_MAX_RANGE_DAYS
};
