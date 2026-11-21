const Joi = require("joi");
const { FOCUS_VALUES } = require("../lib/interviewPrepFocus");
const { GENERATE_KINDS } = require("../lib/interviewPrepGenerate");
const { PREP_PROVIDERS } = require("../lib/providerModels");

const optionalFocusSchema = Joi.string().valid(...FOCUS_VALUES).optional();
const focusSchema = Joi.string().valid(...FOCUS_VALUES).required();

/**
 * Validation schema for creating/updating interview prep main record
 */
const createInterviewPrepSchema = Joi.object({
  company_research: Joi.string()
    .trim()
    .max(10000)
    .allow(null, "")
    .optional()
    .messages({
      "string.max": "Company research notes cannot exceed 10000 characters",
    }),

  reflection_notes: Joi.string()
    .trim()
    .max(10000)
    .allow(null, "")
    .optional()
    .messages({
      "string.max": "Reflection notes cannot exceed 10000 characters",
    }),
});

/**
 * Validation schema for creating an interview question
 */
const createInterviewQuestionSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).required().messages({
    "string.empty": "Question is required",
    "string.min": "Question must be at least 1 character long",
    "string.max": "Question cannot exceed 500 characters",
    "any.required": "Question is required",
  }),

  answer: Joi.string().trim().max(5000).allow(null, "").optional().messages({
    "string.max": "Answer cannot exceed 5000 characters",
  }),

  is_prepared: Joi.boolean().optional(),

  is_exam: Joi.boolean().optional(),

  focus: optionalFocusSchema,
});

/**
 * Validation schema for updating an interview question
 */
const updateInterviewQuestionSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).optional().messages({
    "string.empty": "Question cannot be empty",
    "string.max": "Question cannot exceed 500 characters",
  }),

  answer: Joi.string().trim().max(5000).allow(null, "").optional().messages({
    "string.max": "Answer cannot exceed 5000 characters",
  }),

  is_prepared: Joi.boolean().optional(),

  is_exam: Joi.boolean().optional(),

  focus: optionalFocusSchema,
}).min(1);

/**
 * Validation schema for creating a technical topic
 */
const createTechnicalTopicSchema = Joi.object({
  topic: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "Topic is required",
    "string.min": "Topic must be at least 1 character long",
    "string.max": "Topic cannot exceed 200 characters",
    "any.required": "Topic is required",
  }),

  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "any.only": "Priority must be one of: low, medium, high",
  }),

  is_reviewed: Joi.boolean().optional(),

  focus: optionalFocusSchema,
});

/**
 * Validation schema for updating a technical topic
 */
const updateTechnicalTopicSchema = Joi.object({
  topic: Joi.string().trim().min(1).max(200).optional().messages({
    "string.empty": "Topic cannot be empty",
    "string.max": "Topic cannot exceed 200 characters",
  }),

  priority: Joi.string().valid("low", "medium", "high").optional().messages({
    "any.only": "Priority must be one of: low, medium, high",
  }),

  is_reviewed: Joi.boolean().optional(),

  focus: optionalFocusSchema,
}).min(1);

/**
 * Validation schema for creating a behavioral prep entry (STAR method)
 */
const createBehavioralPrepSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).required().messages({
    "string.empty": "Question is required",
    "string.min": "Question must be at least 1 character long",
    "string.max": "Question cannot exceed 500 characters",
    "any.required": "Question is required",
  }),

  situation: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Situation cannot exceed 2000 characters",
  }),

  task: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Task cannot exceed 2000 characters",
  }),

  action: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Action cannot exceed 2000 characters",
  }),

  result: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Result cannot exceed 2000 characters",
  }),

  focus: optionalFocusSchema,
});

/**
 * Validation schema for updating a behavioral prep entry
 */
const updateBehavioralPrepSchema = Joi.object({
  question: Joi.string().trim().min(1).max(500).optional().messages({
    "string.empty": "Question cannot be empty",
    "string.max": "Question cannot exceed 500 characters",
  }),

  situation: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Situation cannot exceed 2000 characters",
  }),

  task: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Task cannot exceed 2000 characters",
  }),

  action: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Action cannot exceed 2000 characters",
  }),

  result: Joi.string().trim().max(2000).allow(null, "").optional().messages({
    "string.max": "Result cannot exceed 2000 characters",
  }),

  focus: optionalFocusSchema,
}).min(1);

const starterPackSchema = Joi.object({
  focus: focusSchema,
});

const generatePrepSchema = Joi.object({
  kind: Joi.string().valid(...GENERATE_KINDS).required(),
  focus: focusSchema,
  provider: Joi.string().valid(...PREP_PROVIDERS).required(),
});

const acceptGeneratedPrepSchema = Joi.object({
  focus: focusSchema,
  checklist: Joi.array().items(Joi.string().trim().max(200)).max(8).optional(),
  topics: Joi.array()
    .items(
      Joi.object({
        topic: Joi.string().trim().min(1).max(200).required(),
        priority: Joi.string().valid("low", "medium", "high").optional(),
      }),
    )
    .max(12)
    .optional(),
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().min(1).max(500).required(),
        answer: Joi.string().trim().max(5000).allow("").optional(),
        is_exam: Joi.boolean().optional(),
      }),
    )
    .max(12)
    .optional(),
  behavioral: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().trim().min(1).max(500).required(),
        situation: Joi.string().trim().max(2000).allow("").optional(),
        task: Joi.string().trim().max(2000).allow("").optional(),
        action: Joi.string().trim().max(2000).allow("").optional(),
        result: Joi.string().trim().max(2000).allow("").optional(),
      }),
    )
    .max(8)
    .optional(),
}).or("checklist", "topics", "questions", "behavioral");

module.exports = {
  createInterviewPrepSchema,
  createInterviewQuestionSchema,
  updateInterviewQuestionSchema,
  createTechnicalTopicSchema,
  updateTechnicalTopicSchema,
  createBehavioralPrepSchema,
  updateBehavioralPrepSchema,
  starterPackSchema,
  generatePrepSchema,
  acceptGeneratedPrepSchema,
};
