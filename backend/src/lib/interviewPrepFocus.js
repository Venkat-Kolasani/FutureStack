'use strict';

const FOCUS_VALUES = ['oa', 'technical', 'behavioral', 'assignment', 'general'];

const FOCUS_LABELS = {
    oa: 'Online assessment',
    technical: 'Technical interview',
    behavioral: 'Behavioral interview',
    assignment: 'Assignment',
    general: 'First interview',
};

function focusForRoundType(roundType) {
    switch (roundType) {
        case 'oa':
            return 'oa';
        case 'technical':
        case 'technical_assignment':
            return 'technical';
        case 'hr':
        case 'managerial':
        case 'group_discussion':
        case 'final':
            return 'behavioral';
        case 'assignment':
            return 'assignment';
        default:
            return 'general';
    }
}

function isFocus(value) {
    return FOCUS_VALUES.includes(value);
}

module.exports = {
    FOCUS_VALUES,
    FOCUS_LABELS,
    focusForRoundType,
    isFocus,
};
