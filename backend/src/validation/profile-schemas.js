const Joi = require('joi');

/**
 * Validation schema for updating a user profile (PATCH)
 * All fields are optional for partial updates
 */
const updateProfileSchema = Joi.object({
    bio: Joi.string()
        .trim()
        .max(1000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Bio cannot exceed 1000 characters'
        }),

    avatar_url: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Avatar URL must be a valid URL (http or https)',
            'string.max': 'Avatar URL cannot exceed 500 characters'
        }),

    college: Joi.string()
        .trim()
        .max(200)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'College/University name cannot exceed 200 characters'
        }),

    degree: Joi.string()
        .trim()
        .max(200)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Degree name cannot exceed 200 characters'
        }),

    graduation_year: Joi.number()
        .integer()
        .min(1950)
        .max(2100)
        .allow(null)
        .optional()
        .messages({
            'number.min': 'Graduation year must be at least 1950',
            'number.max': 'Graduation year cannot exceed 2100'
        }),

    skills: Joi.string()
        .trim()
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Skills field cannot exceed 500 characters'
        }),

    github_url: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(300)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'GitHub URL must be a valid URL (http or https)',
            'string.max': 'GitHub URL cannot exceed 300 characters'
        }),

    linkedin_url: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(300)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'LinkedIn URL must be a valid URL (http or https)',
            'string.max': 'LinkedIn URL cannot exceed 300 characters'
        }),

    portfolio_url: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Portfolio URL must be a valid URL (http or https)',
            'string.max': 'Portfolio URL cannot exceed 500 characters'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

module.exports = {
    updateProfileSchema
};