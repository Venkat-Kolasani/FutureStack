/**
 * AiResumeCheckPanel — AI-powered resume evaluation panel.
 */

import React, { useState } from 'react';
import { FaGithub, FaChevronDown, FaChevronUp, FaBrain, FaRedo, FaExternalLinkAlt, FaTools } from 'react-icons/fa';
import { getScoreClasses } from './AtsAnalysisPanel';
import { HIRING_AGENT_REPO_URL } from '../../config/features';

const CATEGORY_LABELS = {
    open_source: 'Open Source',
    self_projects: 'Self Projects',
    production: 'Production',
    technical_skills: 'Technical Skills',
};

/** Each category is scored 0–25 (matches backend evaluator schema). */
const CATEGORY_MAX = 25;

const LOADING_STEPS = [
    'Extracting resume text',
    'Parsing structure with LLM',
    'Checking GitHub signals',
    'Generating scores & feedback',
];

function formatCheckedAt(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CategoryBar = ({ label, score, max = CATEGORY_MAX }) => {
    const pct = max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;
    const color =
        pct >= 70 ? 'bg-emerald-500' :
        pct >= 40 ? 'bg-amber-500' :
                    'bg-red-500';

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white tabular-nums">{score}/{max}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

const ComingSoonPanel = () => (
    <div className="mt-3 rounded-lg border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2 mb-2">
            <FaTools className="text-violet-400 shrink-0" size={13} />
            <p className="text-sm font-medium text-violet-200">AI Resume Check — under development</p>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            This feature will score open source work, projects, production experience, and technical skills
            using an agentic pipeline adapted from HackerRank&apos;s open-source hiring agent.
        </p>
        <a
            href={HIRING_AGENT_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-violet-300 hover:text-violet-200 transition-colors"
        >
            <FaGithub size={12} />
            interviewstreet/hiring-agent
            <FaExternalLinkAlt size={9} className="opacity-70" />
        </a>
        <p className="mt-2 text-[10px] text-gray-600">
            MIT © HackerRank — rule-based ATS scoring above remains available today.
        </p>
    </div>
);

const AiResumeCheckPanel = ({
    checkResult = null,
    isAnalyzing = false,
    isHydrating = false,
    isOpen = false,
    onToggle,
    onRetry,
    comingSoon = false,
}) => {
    const [showEvidence, setShowEvidence] = useState(false);

    if (comingSoon) {
        return <ComingSoonPanel />;
    }

    if (isHydrating) {
        return (
            <div className="mt-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white/[0.02] px-4 py-3 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-3 w-3 rounded-full bg-violet-500/30" />
                    <div className="h-3 w-32 rounded bg-white/10" />
                </div>
                <div className="h-2 w-full rounded bg-black/5 dark:bg-white/5" />
            </div>
        );
    }

    if (isAnalyzing) {
        return (
            <div className="mt-3 rounded-lg border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 mb-2">
                    <FaBrain className="text-violet-400 animate-pulse shrink-0" size={14} />
                    <p className="text-sm font-medium text-violet-200">AI Resume Check running…</p>
                </div>
                <ul className="space-y-1.5 mb-3">
                    {LOADING_STEPS.map((step, i) => (
                        <li key={step} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${i === 0 ? 'bg-violet-400 animate-pulse' : 'bg-white/20'}`} />
                            {step}
                        </li>
                    ))}
                </ul>
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full animate-pulse w-2/3" />
                </div>
                <p className="mt-2 text-[11px] text-gray-500">Usually 20–60 seconds. Keep this tab open.</p>
            </div>
        );
    }

    if (!checkResult) {
        return (
            <div className="mt-3 rounded-lg border border-dashed border-violet-500/20 bg-violet-500/[0.03] px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                    <FaBrain className="text-violet-400" size={12} />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">No AI check yet</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    Tap <span className="text-violet-300 font-medium">AI Check</span> to score open source work,
                    projects, production experience, and technical skills with an LLM.
                </p>
            </div>
        );
    }

    if (checkResult.status === 'failed') {
        return (
            <div className="mt-3 rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <FaBrain className="text-red-400 shrink-0" size={12} />
                            <p className="text-sm font-medium text-red-300">AI check failed</p>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {checkResult.error || 'Analysis could not be completed. Please try again.'}
                        </p>
                    </div>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                        >
                            <FaRedo size={10} />
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const score = checkResult.overall_score ?? 0;
    const scoreClasses = getScoreClasses(score);
    const cats = checkResult.category_scores || {};
    const strengths = checkResult.strengths || [];
    const suggestions = checkResult.suggestions || [];
    const evidence = checkResult.evidence || {};
    const github = checkResult.github_summary;
    const provider = checkResult.provider;
    const model = checkResult.model;
    const checkedAt = formatCheckedAt(checkResult.updated_at || checkResult.created_at);

    return (
        <div className="mt-3 rounded-lg border border-violet-500/15 bg-white dark:bg-black/25 overflow-hidden">
            <button
                type="button"
                className="flex w-full items-center justify-between gap-3 p-3 text-left cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <FaBrain className="text-violet-400 shrink-0" size={13} />
                    <div className="min-w-0">
                        <span className="text-xs text-gray-600 dark:text-gray-400 block">AI Resume Score</span>
                        {checkedAt && (
                            <span className="text-[10px] text-gray-600">Checked {checkedAt}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreClasses.bg} ${scoreClasses.text}`}>
                        {score}/100
                    </span>
                    {onToggle && (
                        isOpen
                            ? <FaChevronUp size={11} className="text-gray-500" />
                            : <FaChevronDown size={11} className="text-gray-500" />
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="px-3 pb-4 space-y-4 border-t border-white/5 pt-3">
                    <div className="space-y-2">
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <CategoryBar
                                key={key}
                                label={label}
                                score={cats[key] ?? 0}
                            />
                        ))}
                    </div>

                    {(checkResult.bonus > 0 || checkResult.deductions > 0) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {checkResult.bonus > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                    +{checkResult.bonus} bonus
                                </span>
                            )}
                            {checkResult.deductions > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                                    −{checkResult.deductions} deductions
                                </span>
                            )}
                        </div>
                    )}

                    {strengths.length > 0 && (
                        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                            <p className="text-xs font-semibold text-emerald-300/90 mb-1.5">Strengths</p>
                            <ul className="space-y-1">
                                {strengths.map((s, i) => (
                                    <li key={i} className="flex gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {suggestions.length > 0 && (
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
                            <p className="text-xs font-semibold text-amber-300/90 mb-1.5">Suggestions</p>
                            <ul className="space-y-1">
                                {suggestions.map((s, i) => (
                                    <li key={i} className="flex gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <span className="text-amber-400 mt-0.5 shrink-0">→</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {github && (
                        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <FaGithub size={12} className="text-gray-600 dark:text-gray-400" />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    GitHub @{github.username}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                                <span>{github.publicRepos} repos</span>
                                <span>{github.totalStars} stars</span>
                                <span>{github.followers} followers</span>
                            </div>
                            {github.topProjects?.length > 0 && (
                                <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                                    Highlighted: {github.topProjects.join(', ')}
                                </p>
                            )}
                        </div>
                    )}

                    {Object.values(evidence).some(Boolean) && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowEvidence(v => !v)}
                                className="flex items-center gap-1 text-xs font-medium text-violet-400 hover:text-violet-300"
                            >
                                {showEvidence ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                {showEvidence ? 'Hide' : 'Show'} evaluation evidence
                            </button>
                            {showEvidence && (
                                <ul className="mt-2 space-y-1.5 rounded-lg bg-white/[0.02] border border-white/5 p-2">
                                    {Object.entries(evidence).map(([key, val]) => val ? (
                                        <li key={key} className="text-[11px] text-gray-500 leading-relaxed">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                                                {CATEGORY_LABELS[key] || key}:
                                            </span>{' '}
                                            {val}
                                        </li>
                                    ) : null)}
                                </ul>
                            )}
                        </div>
                    )}

                    <p className="text-[10px] text-gray-600 leading-relaxed border-t border-white/5 pt-2">
                        AI-generated — not an official score. Model: {provider || 'LLM'}/{model || 'unknown'}.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AiResumeCheckPanel;
