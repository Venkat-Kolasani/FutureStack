'use strict';

const { z } = require('zod');
const { FOCUS_LABELS, isFocus } = require('./interviewPrepFocus');

const GENERATE_KINDS = ['plan', 'questions', 'star', 'exam'];

const questionSchema = z.object({
    question: z.string().min(1).max(500),
    answer: z.string().max(5000).optional().default(''),
});

const topicSchema = z.object({
    topic: z.string().min(1).max(200),
    priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

const starSchema = z.object({
    question: z.string().min(1).max(500),
    situation: z.string().max(2000).optional().default(''),
    task: z.string().max(2000).optional().default(''),
    action: z.string().max(2000).optional().default(''),
    result: z.string().max(2000).optional().default(''),
});

const SCHEMAS = {
    plan: z.object({
        checklist: z.array(z.string().min(1).max(200)).min(3).max(6),
        topics: z.array(topicSchema).min(3).max(6),
    }),
    questions: z.object({
        questions: z.array(questionSchema).min(4).max(8),
    }),
    star: z.object({
        behavioral: z.array(starSchema).min(3).max(4),
    }),
    exam: z.object({
        questions: z.array(questionSchema).length(8),
    }),
};

function isGenerateKind(kind) {
    return GENERATE_KINDS.includes(kind);
}

function schemaForKind(kind) {
    return SCHEMAS[kind] || null;
}

function buildPrepPrompt({ kind, focus, opportunity, stories = [] }) {
    const label = FOCUS_LABELS[focus] || 'interview';
    const storyLines = stories
        .slice(0, 5)
        .map((story) => `- ${story.question}`)
        .join('\n');

    const context = [
        `Role: ${opportunity.title || 'Internship'}`,
        `Focus: ${label}`,
        opportunity.description ? `Description:\n${String(opportunity.description).slice(0, 4000)}` : '',
        opportunity.notes ? `Candidate notes:\n${String(opportunity.notes).slice(0, 2000)}` : '',
        storyLines ? `Stories the candidate has already written:\n${storyLines}` : '',
    ].filter(Boolean).join('\n\n');

    const instructions = {
        plan: 'Create a short study checklist and review topics for this round. Keep each item specific and practical.',
        questions: 'Write interview questions with a concise model answer the candidate can edit.',
        star: 'Draft STAR prompts. Fill situation, task, action, and result only when the candidate notes support it. Otherwise leave those fields empty.',
        exam: 'Write exactly 8 practice questions with model answers. Mix conceptual and applied questions for this focus.',
    }[kind];

    return {
        system: 'You prepare students for internships. Return only the structured object. Do not invent employers, compensation, or private facts that are not in the prompt.',
        prompt: `${instructions}\n\n${context}`,
    };
}

module.exports = {
    GENERATE_KINDS,
    isGenerateKind,
    schemaForKind,
    buildPrepPrompt,
};
