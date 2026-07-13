/**
 * AtsAnalysisPanel - Shared ATS score breakdown UI for document cards and upload flow.
 */
import React, { useState } from 'react';

export const parseAtsAnalysis = (analysis) => {
    if (!analysis) return null;
    if (typeof analysis === 'object') return analysis;

    try {
        return JSON.parse(analysis);
    } catch (error) {
        return null;
    }
};

export const getScoreClasses = (score) => {
    if (score >= 75) return { text: 'text-emerald-300', stroke: 'stroke-emerald-400', bg: 'bg-emerald-500/15' };
    if (score >= 50) return { text: 'text-amber-300', stroke: 'stroke-amber-400', bg: 'bg-amber-500/15' };
    return { text: 'text-red-300', stroke: 'stroke-red-400', bg: 'bg-red-500/15' };
};

export const ScoreRing = ({ score }) => {
    const classes = getScoreClasses(score);
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative h-12 w-12 shrink-0">
            <svg className="-rotate-90 h-12 w-12" viewBox="0 0 48 48" aria-hidden="true">
                <circle className="stroke-white/10" cx="24" cy="24" r={radius} fill="none" strokeWidth="4" />
                <circle
                    className={classes.stroke}
                    cx="24"
                    cy="24"
                    r={radius}
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${classes.text}`}>
                {score}
            </span>
        </div>
    );
};

const AtsAnalysisPanel = ({
    score = null,
    analysis = null,
    isOpen = false,
    onToggle,
    isAnalyzing = false,
    showEmptyState = false,
}) => {
    const [showScoring, setShowScoring] = useState(false);
    const parsedAnalysis = parseAtsAnalysis(analysis);
    const hasScore = score != null;

    if (isAnalyzing) {
        return (
            <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <p className="text-sm font-medium text-blue-200">Analyzing resume...</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Extracting text and scoring structure, content, and ATS-friendly signals.</p>
            </div>
        );
    }

    if (showEmptyState && !hasScore) {
        return (
            <div className="mt-3 rounded-lg border border-dashed border-white/15 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">No ATS score yet</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Use Check ATS Score below to analyze this resume. Rule-based hints only — not an official ATS score.
                </p>
            </div>
        );
    }

    if (!hasScore) {
        return null;
    }

    return (
        <div className="mt-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Rule-based hints — not an official ATS score</p>
                {onToggle && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="text-xs font-medium text-blue-300 hover:text-blue-200"
                    >
                        {isOpen ? 'Hide' : 'Details'}
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-md bg-black/5 dark:bg-white/5 p-2">
                            <p className="text-gray-500">Structure</p>
                            <p className="mt-1 text-gray-900 dark:text-white">{parsedAnalysis?.breakdown?.structure ?? '--'}/60</p>
                        </div>
                        <div className="rounded-md bg-black/5 dark:bg-white/5 p-2">
                            <p className="text-gray-500">Content</p>
                            <p className="mt-1 text-gray-900 dark:text-white">{parsedAnalysis?.breakdown?.content ?? '--'}/25</p>
                        </div>
                        <div className="rounded-md bg-black/5 dark:bg-white/5 p-2">
                            <p className="text-gray-500">ATS</p>
                            <p className="mt-1 text-gray-900 dark:text-white">{parsedAnalysis?.breakdown?.atsFriendly ?? '--'}/15</p>
                        </div>
                    </div>

                    {parsedAnalysis?.missingSections?.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Missing sections</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {parsedAnalysis.missingSections.map(section => (
                                    <span key={section} className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-300">
                                        {section}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {parsedAnalysis?.suggestions?.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Top suggestions</p>
                            <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                {parsedAnalysis.suggestions.slice(0, 3).map(suggestion => (
                                    <li key={suggestion}>{suggestion}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {parsedAnalysis?.matchedKeywords?.length > 0 && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Role keywords matched ({parsedAnalysis.matchedKeywords.length}): {parsedAnalysis.matchedKeywords.slice(0, 8).join(', ')}
                            {parsedAnalysis.matchedKeywords.length > 8 ? '…' : ''}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowScoring(open => !open)}
                        className="text-xs font-medium text-blue-300 hover:text-blue-200"
                    >
                        How is this scored?
                    </button>
                    {showScoring && (
                        <ul className="space-y-1 text-xs text-gray-500">
                            {(parsedAnalysis?.howScored || [
                                'Structure: 60 points across required resume sections.',
                                'Content: 25 points for skills depth, projects, and experience bullets.',
                                'ATS-friendly: 15 points for length, contact details, and LinkedIn/GitHub.'
                            ]).map(item => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default AtsAnalysisPanel;
