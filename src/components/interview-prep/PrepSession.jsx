import React from 'react';
import Button from '../common/Button';
import { FOCUS_LABELS, sessionReadiness } from '../../utils/interviewPrepSession';

const PrepSession = ({
    focus,
    questions,
    topics,
    behavioral,
    onStartPractice,
    onStarter,
    seeding,
}) => {
    const readiness = sessionReadiness(focus, questions, topics, behavioral);
    const unprepared = readiness.questions.filter((item) => !item.is_prepared).length
        + readiness.topics.filter((item) => !item.is_reviewed).length;
    const readyLabel = readiness.total === 0
        ? 'No checklist yet'
        : `${readiness.done} of ${readiness.total} ready`;

    return (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="sm:text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{FOCUS_LABELS[focus]}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{readyLabel}</p>
            </div>
            {readiness.total > 0 ? (
                <Button
                    variant="primarySolid"
                    onClick={onStartPractice}
                    disabled={unprepared === 0 && readiness.questions.length === 0}
                >
                    Start practice
                </Button>
            ) : (
                <Button variant="primarySolid" onClick={onStarter} disabled={seeding}>
                    {seeding ? 'Adding…' : 'Add a starter pack'}
                </Button>
            )}
        </div>
    );
};

export default PrepSession;
