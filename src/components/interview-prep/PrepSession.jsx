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

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Next session</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{FOCUS_LABELS[focus]}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                {readiness.total === 0
                    ? 'This round has no checklist yet.'
                    : `${readiness.done} of ${readiness.total} ready · ${readiness.percent}%`}
            </p>
            <div className="flex flex-wrap gap-2">
                {readiness.total > 0 && (
                    <Button variant="primary" onClick={onStartPractice} disabled={unprepared === 0 && readiness.questions.length === 0}>
                        Start practice
                    </Button>
                )}
                {readiness.total === 0 && (
                    <Button variant="primary" onClick={onStarter} disabled={seeding}>
                        {seeding ? 'Adding…' : 'Add a starter pack'}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default PrepSession;
