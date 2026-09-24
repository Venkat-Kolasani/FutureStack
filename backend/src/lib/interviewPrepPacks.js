'use strict';

const { isFocus } = require('./interviewPrepFocus');

const PACKS = {
    oa: {
        questions: [
            { question: 'How do you approach a timed coding problem when you are unsure of the optimal solution?' },
            { question: 'Walk through how you would debug a failing hidden test case.' },
            { question: 'What is your process for estimating time and space complexity?' },
            { question: 'Describe a data structure you would use for fast lookup and why.' },
            { question: 'How do you decide when to brute force versus optimize?' },
            { question: 'What do you do if you finish early in an online assessment?' },
        ],
        topics: [
            { topic: 'Arrays and strings', priority: 'high' },
            { topic: 'Hash maps and sets', priority: 'high' },
            { topic: 'Two pointers and sliding window', priority: 'medium' },
            { topic: 'Basic recursion', priority: 'medium' },
            { topic: 'Time management during the test', priority: 'high' },
        ],
        behavioral: [],
    },
    technical: {
        questions: [
            { question: 'Tell me about a project you are proud of and the hardest bug in it.' },
            { question: 'How would you design a simple URL shortener?' },
            { question: 'Explain a time you chose a tradeoff between speed of delivery and code quality.' },
            { question: 'How do you test a feature before you call it done?' },
            { question: 'What happens when you type a URL into the browser?' },
            { question: 'How would you find a bug that only appears in production?' },
        ],
        topics: [
            { topic: 'Language fundamentals for this role', priority: 'high' },
            { topic: 'Data structures you can code on a whiteboard', priority: 'high' },
            { topic: 'One project you can draw and explain', priority: 'high' },
            { topic: 'API design and error handling', priority: 'medium' },
            { topic: 'Complexity you can defend out loud', priority: 'medium' },
        ],
        behavioral: [
            { question: 'Tell me about a time you disagreed with a teammate.' },
            { question: 'Tell me about a time you missed a deadline.' },
        ],
    },
    behavioral: {
        questions: [
            { question: 'Why this company, and why this role?' },
            { question: 'What are you looking for in the next six months?' },
            { question: 'What question do you want to ask the interviewer?' },
        ],
        topics: [
            { topic: 'Company product in one sentence', priority: 'high' },
            { topic: 'Role responsibilities from the description', priority: 'high' },
            { topic: 'Two questions to ask them', priority: 'medium' },
        ],
        behavioral: [
            { question: 'Tell me about a time you handled a conflict.' },
            { question: 'Tell me about a time you failed.' },
            { question: 'Tell me about a time you led without authority.' },
            { question: 'Tell me about a time you learned something quickly.' },
        ],
    },
    assignment: {
        questions: [
            { question: 'What is the assignment asking for, in one paragraph?' },
            { question: 'What will you leave out so you can finish?' },
            { question: 'How will you demo the result?' },
            { question: 'What would you improve with another day?' },
        ],
        topics: [
            { topic: 'Requirements and constraints', priority: 'high' },
            { topic: 'Submission deadline and format', priority: 'high' },
            { topic: 'Happy-path demo', priority: 'high' },
            { topic: 'README and how to run it', priority: 'medium' },
        ],
        behavioral: [],
    },
    general: {
        questions: [
            { question: 'Walk me through your background in two minutes.' },
            { question: 'Why are you interested in this internship?' },
            { question: 'Describe a project on your resume in detail.' },
            { question: 'What is a technical concept you can explain clearly?' },
            { question: 'What questions will you ask at the end?' },
        ],
        topics: [
            { topic: 'Resume projects you can defend', priority: 'high' },
            { topic: 'Role description', priority: 'high' },
            { topic: 'One technical topic you know well', priority: 'medium' },
        ],
        behavioral: [
            { question: 'Tell me about yourself.' },
            { question: 'Tell me about a challenge you worked through.' },
            { question: 'Tell me about a time you worked with others.' },
        ],
    },
};

function getStarterPack(focus) {
    if (!isFocus(focus)) return null;
    return PACKS[focus];
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

module.exports = { getStarterPack, normalizeText, PACKS };
