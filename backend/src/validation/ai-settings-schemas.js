'use strict';

const Joi = require('joi');

const saveAiSettingsSchema = Joi.object({
    provider: Joi.string()
        .valid('gemini', 'groq', 'anthropic', 'ollama')
        .default('gemini')
        .messages({ 'any.only': 'Provider must be gemini, groq, anthropic, or ollama' }),

    model: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .default('gemini-3.1-flash-lite')
        .messages({ 'string.max': 'Model name cannot exceed 100 characters' }),

    apiKey: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow('')
        .custom((value, helpers) => {
            if (value && value.length > 0 && value.length < 10) {
                return helpers.error('string.min');
            }
            return value;
        })
        .messages({
            'string.min': 'API key looks too short',
            'string.max': 'API key cannot exceed 500 characters',
        }),
});

module.exports = { saveAiSettingsSchema };
