const Joi = require('joi');

/**
 * Validation schema for creating a new opportunity
 */
const createOpportunitySchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.empty': 'Title is required and cannot be empty',
            'string.min': 'Title must be at least 1 character long',
            'string.max': 'Title cannot exceed 200 characters',
            'any.required': 'Title is required'
        }),

    description: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 5000 characters'
        }),

    link: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(2048)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Link must be a valid URL (http or https)',
            'string.max': 'Link cannot exceed 2048 characters'
        }),

    deadline: Joi.date()
        .iso()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Deadline must be a valid ISO date format'
        }),

    applied_on: Joi.date()
        .iso()
        .raw()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Applied on must be a valid ISO date format'
        }),

    category: Joi.string()
        .valid('internship', 'hackathon')
        .allow(null)
        .optional()
        .messages({
            'any.only': 'Category must be either "internship" or "hackathon"'
        }),

    status: Joi.string()
        .valid('applied', 'interviewed', 'shortlisted', 'selected', 'rejected', 'ghosted')
        .default('applied')
        .optional()
        .messages({
            'any.only': 'Status must be one of: applied, interviewed, shortlisted, selected, rejected'
        }),

    notes: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Notes cannot exceed 5000 characters'
        }),

    campus_mode: Joi.string()
        .valid('on_campus', 'off_campus')
        .allow(null, '')
        .optional()
        .messages({
            'any.only': 'Campus mode must be "on_campus" or "off_campus"'
        })
});

/**
 * Validation schema for updating an opportunity
 * All fields are optional for partial updates
 */
const updateOpportunitySchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .optional()
        .messages({
            'string.empty': 'Title cannot be empty',
            'string.min': 'Title must be at least 1 character long',
            'string.max': 'Title cannot exceed 200 characters'
        }),

    description: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 5000 characters'
        }),

    link: Joi.string()
        .trim()
        .uri({ scheme: ['http', 'https'] })
        .max(2048)
        .allow(null, '')
        .optional()
        .messages({
            'string.uri': 'Link must be a valid URL (http or https)',
            'string.max': 'Link cannot exceed 2048 characters'
        }),

    deadline: Joi.date()
        .iso()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Deadline must be a valid ISO date format'
        }),

    applied_on: Joi.date()
        .iso()
        .raw()
        .allow(null)
        .optional()
        .messages({
            'date.format': 'Applied on must be a valid ISO date format'
        }),

    category: Joi.string()
        .valid('internship', 'hackathon')
        .allow(null)
        .optional()
        .messages({
            'any.only': 'Category must be either "internship" or "hackathon"'
        }),

    status: Joi.string()
        .valid('applied', 'interviewed', 'shortlisted', 'selected', 'rejected', 'ghosted')
        .optional()
        .messages({
            'any.only': 'Status must be one of: applied, interviewed, shortlisted, selected, rejected'
        }),

    notes: Joi.string()
        .trim()
        .max(5000)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Notes cannot exceed 5000 characters'
        }),

    campus_mode: Joi.string()
        .valid('on_campus', 'off_campus')
        .allow(null, '')
        .optional()
        .messages({
            'any.only': 'Campus mode must be "on_campus" or "off_campus"'
        })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

/**
 * Validation schema for UUID parameters
 */
const idParamSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.uuid': 'Invalid opportunity ID format',
            'any.required': 'Opportunity ID is required'
        })
});

const opportunityListQuerySchema = Joi.object({
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(25)
        .messages({
            'number.base': 'limit must be a number',
            'number.integer': 'limit must be an integer',
            'number.min': 'limit must be at least 1',
            'number.max': 'limit cannot exceed 100',
        }),
    cursor: Joi.string().trim().max(512).optional(),
    status: Joi.string()
        .valid('applied', 'interviewed', 'shortlisted', 'selected', 'rejected', 'ghosted')
        .optional(),
    category: Joi.string().valid('internship', 'hackathon').optional(),
});

const hackathonIdeaParamsSchema = Joi.object({
    opportunityId: Joi.string().uuid().required(),
    ideaId: Joi.string().uuid().required(),
});

const teamInviteTokenParamsSchema = Joi.object({
    token: Joi.string()
        .pattern(/^[A-Za-z0-9_-]{43}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid invite token format',
        }),
});

// =============================================================================
// HACKATHON TEAM COLLABORATION SCHEMAS
// =============================================================================

/**
 * Validation schema for creating a hackathon team
 */
const createTeamSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Team name is required',
            'string.min': 'Team name must be at least 1 character long',
            'string.max': 'Team name cannot exceed 100 characters',
            'any.required': 'Team name is required'
        }),

    description: Joi.string()
        .trim()
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        })
});

/**
 * Validation schema for updating a hackathon team
 */
const updateTeamSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .messages({
            'string.empty': 'Team name cannot be empty',
            'string.max': 'Team name cannot exceed 100 characters'
        }),

    description: Joi.string()
        .trim()
        .max(500)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        })
}).min(1);

const createTeamInviteSchema = Joi.object({
    role: Joi.string().valid('editor', 'viewer').default('editor'),
    expiresInHours: Joi.number().integer().min(1).max(24 * 30).default(24 * 7),
});

/**
 * Validation schema for creating a team member
 */
const createTeamMemberSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Member name is required',
            'any.required': 'Member name is required'
        }),

    role: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .optional()
        .messages({
            'string.max': 'Role cannot exceed 50 characters'
        }),

    email: Joi.string()
        .trim()
        .email()
        .max(200)
        .allow(null, '')
        .optional()
        .messages({
            'string.email': 'Invalid email format'
        })
});

/**
 * Validation schema for updating a team member
 */
const updateTeamMemberSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

    role: Joi.string()
        .trim()
        .max(50)
        .allow(null, '')
        .optional(),

    email: Joi.string()
        .trim()
        .email()
        .max(200)
        .allow(null, '')
        .optional()
}).min(1);

/**
 * Validation schema for creating a brainstorm idea
 */
const createIdeaSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.empty': 'Idea title is required',
            'any.required': 'Idea title is required'
        }),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .optional(),

    category: Joi.string()
        .valid('feature', 'design', 'tech', 'other')
        .optional()
        .messages({
            'any.only': 'Category must be one of: feature, design, tech, other'
        })
});

/**
 * Validation schema for updating a brainstorm idea
 */
const updateIdeaSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .optional(),

    category: Joi.string()
        .valid('feature', 'design', 'tech', 'other')
        .optional(),

    is_selected: Joi.boolean()
        .optional()
}).min(1);

/**
 * Validation schema for creating a hackathon task
 */
const createTaskSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.empty': 'Task title is required',
            'any.required': 'Task title is required'
        }),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .optional(),

    assigned_to: Joi.string()
        .trim()
        .max(100)
        .allow(null, '')
        .optional(),

    status: Joi.string()
        .valid('todo', 'in_progress', 'done')
        .optional()
        .messages({
            'any.only': 'Status must be one of: todo, in_progress, done'
        }),

    priority: Joi.string()
        .valid('low', 'medium', 'high')
        .optional()
        .messages({
            'any.only': 'Priority must be one of: low, medium, high'
        }),

    due_date: Joi.date()
        .iso()
        .allow(null)
        .optional()
});

/**
 * Validation schema for updating a hackathon task
 */
const updateTaskSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

    description: Joi.string()
        .trim()
        .max(2000)
        .allow(null, '')
        .optional(),

    assigned_to: Joi.string()
        .trim()
        .max(100)
        .allow(null, '')
        .optional(),

    status: Joi.string()
        .valid('todo', 'in_progress', 'done')
        .optional(),

    priority: Joi.string()
        .valid('low', 'medium', 'high')
        .optional(),

    due_date: Joi.date()
        .iso()
        .allow(null)
        .optional()
}).min(1);

/**
 * Validation schema for creating a checklist item
 */
const createChecklistItemSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.empty': 'Checklist item title is required',
            'any.required': 'Checklist item title is required'
        }),

    sort_order: Joi.number()
        .integer()
        .min(0)
        .optional()
});

/**
 * Validation schema for updating a checklist item
 */
const updateChecklistItemSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

    is_completed: Joi.boolean()
        .optional(),

    sort_order: Joi.number()
        .integer()
        .min(0)
        .optional()
}).min(1);

module.exports = {
    createOpportunitySchema,
    updateOpportunitySchema,
    idParamSchema,
    opportunityListQuerySchema,
    hackathonIdeaParamsSchema,
    teamInviteTokenParamsSchema,
    // Hackathon team collaboration
    createTeamSchema,
    updateTeamSchema,
    createTeamInviteSchema,
    createTeamMemberSchema,
    updateTeamMemberSchema,
    createIdeaSchema,
    updateIdeaSchema,
    createTaskSchema,
    updateTaskSchema,
    createChecklistItemSchema,
    updateChecklistItemSchema
};
