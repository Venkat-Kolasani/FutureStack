/**
 * DocumentCard - Displays a single document with its details and actions.
 * Shows document type icon, name, version, metadata, usage count, and action buttons.
 *
 * @module components/documents/DocumentCard
 */
import React, { useState, useRef, useEffect } from 'react';
import { FaFile, FaFilePdf, FaLink, FaDownload, FaEdit, FaTrash, FaBriefcase, FaChartBar, FaSpinner, FaBrain } from 'react-icons/fa';
import AtsAnalysisPanel, { getScoreClasses } from './AtsAnalysisPanel';
import AiResumeCheckPanel from './AiResumeCheckPanel';
import { isAtsEligible } from '../../utils/atsScorer';
import { AI_RESUME_CHECK_ENABLED } from '../../config/features';

const typeIcons = {
    resume: FaFilePdf,
    cover_letter: FaFile,
    portfolio: FaLink,
    other: FaFile
};

const typeColors = {
    resume: 'text-blue-400',
    cover_letter: 'text-green-400',
    portfolio: 'text-purple-400',
    other: 'text-gray-600 dark:text-gray-400'
};

const typeLabels = {
    resume: 'Resume',
    cover_letter: 'Cover Letter',
    portfolio: 'Portfolio',
    other: 'Other'
};

/**
 * Card component for displaying a document with actions.
 *
 * @param {Object} props - Component props
 * @param {Object} props.document - Document object with id, name, type, version, file_url, file_size, notes, is_external, created_at, and opportunity_documents
 * @param {Function} props.onEdit - Callback when edit button is clicked, receives the document object
 * @param {Function} props.onDelete - Callback when delete button is clicked, receives the document object
 * @param {Function} [props.onCheckAts] - Callback to run or re-run ATS analysis on uploaded resumes
 * @param {boolean} [props.isCheckingAts=false] - Whether ATS analysis is in progress for this card
 * @returns {JSX.Element} Rendered document card
 */
const DocumentCard = ({
    document,
    onEdit,
    onDelete,
    onCheckAts,
    isCheckingAts = false,
    onAiCheck,
    isAiChecking = false,
    isHydratingAiCheck = false,
    aiCheckResult = null,
}) => {
    const Icon = typeIcons[document.type] || FaFile;
    const colorClass = typeColors[document.type] || 'text-gray-600 dark:text-gray-400';
    const canCheckAts = isAtsEligible(document);
    const canAiCheck = AI_RESUME_CHECK_ENABLED && document.type === 'resume' && !document.is_external;
    const showAiComingSoon = !AI_RESUME_CHECK_ENABLED && document.type === 'resume' && !document.is_external;
    const atsScore = canCheckAts ? document.ats_score : null;
    const aiScore = aiCheckResult?.status === 'completed' ? aiCheckResult.overall_score : null;
    const [isAtsOpen, setIsAtsOpen] = useState(false);
    const [isAiOpen, setIsAiOpen] = useState(false);
    const wasCheckingRef = useRef(false);
    const wasAiCheckingRef = useRef(false);
    const scoreClasses = atsScore != null ? getScoreClasses(atsScore) : null;
    const aiScoreClasses = aiScore != null ? getScoreClasses(aiScore) : null;
    const atsButtonLabel = atsScore != null ? 'Refresh ATS' : 'Check ATS';
    const aiButtonLabel = aiCheckResult?.status === 'completed' ? 'Re-run AI' : 'AI Check';
    const comingSoonButtonLabel = 'Coming soon';
    const primaryButtonClass = 'flex-1 min-w-0 h-10 flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-colors';
    const analysisButtonClass = 'w-full h-10 flex items-center justify-center gap-1.5 px-2 rounded-lg text-xs whitespace-nowrap transition-colors';

    useEffect(() => {
        if (isCheckingAts) {
            wasCheckingRef.current = true;
            return;
        }
        if (wasCheckingRef.current && atsScore != null) {
            setIsAtsOpen(true);
            wasCheckingRef.current = false;
        }
    }, [isCheckingAts, atsScore]);

    useEffect(() => {
        if (isAiChecking) {
            wasAiCheckingRef.current = true;
            return;
        }
        if (wasAiCheckingRef.current && aiCheckResult?.status === 'completed') {
            setIsAiOpen(true);
            wasAiCheckingRef.current = false;
        }
    }, [isAiChecking, aiCheckResult]);

    // Count how many opportunities use this document
    const usageCount = document.opportunity_documents?.length || 0;

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes) return null;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleCheckAts = () => {
        if (!canCheckAts || isCheckingAts) return;
        onCheckAts?.(document);
    };

    const handleAiCheck = () => {
        if (!canAiCheck || isAiChecking) return;
        onAiCheck?.(document);
    };

    return (
        <div className="bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-white/20 transition-all group h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center ${colorClass}`}>
                    <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-gray-900 dark:text-white font-medium truncate">{document.name}</h3>
                        {atsScore != null && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${scoreClasses.bg} ${scoreClasses.text}`}>
                                ATS {document.ats_score}
                            </span>
                        )}
                        {aiScore != null && (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${aiScoreClasses.bg} ${aiScoreClasses.text}`}>
                                AI {aiScore}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>{typeLabels[document.type]}</span>
                        {document.version && (
                            <>
                                <span className="text-gray-600">•</span>
                                <span className="text-gray-500">{document.version}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                {document.file_size && (
                    <span>{formatSize(document.file_size)}</span>
                )}
                <span>{formatDate(document.created_at)}</span>
                {document.is_external && (
                    <span className="text-purple-400">External Link</span>
                )}
            </div>

            {/* Notes preview */}
            {document.notes && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{document.notes}</p>
            )}

            {/* Usage badge */}
            {usageCount > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-blue-400">
                    <FaBriefcase size={12} />
                    <span>Used in {usageCount} {usageCount === 1 ? 'opportunity' : 'opportunities'}</span>
                </div>
            )}

            {canCheckAts && (
                <AtsAnalysisPanel
                    score={atsScore}
                    analysis={document.ats_analysis}
                    isOpen={isAtsOpen}
                    onToggle={() => setIsAtsOpen(open => !open)}
                    isAnalyzing={isCheckingAts}
                    showEmptyState={atsScore == null}
                />
            )}

                {canAiCheck && (
                <AiResumeCheckPanel
                    checkResult={aiCheckResult}
                    isAnalyzing={isAiChecking}
                    isHydrating={isHydratingAiCheck}
                    isOpen={isAiOpen}
                    onToggle={() => setIsAiOpen(open => !open)}
                    onRetry={handleAiCheck}
                />
            )}

            {showAiComingSoon && (
                <AiResumeCheckPanel comingSoon />
            )}

            {/* Actions */}
            <div className="mt-auto pt-4 space-y-2">
                {/* Row 1: download/open + edit/delete */}
                <div className="flex items-stretch gap-2">
                    {document.file_url && (
                        <a
                            href={document.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${primaryButtonClass} bg-blue-600/20 text-blue-400 hover:bg-blue-600/30`}
                        >
                            {document.is_external ? <FaLink size={14} className="shrink-0" /> : <FaDownload size={14} className="shrink-0" />}
                            <span>{document.is_external ? 'Open' : 'Download'}</span>
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => onEdit(document)}
                        className="h-10 w-10 shrink-0 flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        title="Edit"
                    >
                        <FaEdit size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(document)}
                        className="h-10 w-10 shrink-0 flex items-center justify-center bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"
                        title="Delete"
                    >
                        <FaTrash size={14} />
                    </button>
                </div>

                {/* Row 2: analysis actions (resumes only) */}
                {(canCheckAts || canAiCheck || showAiComingSoon) && (
                    <div className={`grid gap-2 ${(canCheckAts && (canAiCheck || showAiComingSoon)) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {canCheckAts && (
                            <button
                                type="button"
                                onClick={handleCheckAts}
                                disabled={isCheckingAts}
                                title={atsScore != null ? 'Re-check ATS Score' : 'Check ATS Score'}
                                className={`${analysisButtonClass} bg-purple-600/15 text-purple-300 hover:bg-purple-600/25 disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                {isCheckingAts ? (
                                    <>
                                        <FaSpinner className="animate-spin shrink-0" size={14} />
                                        <span>Analyzing…</span>
                                    </>
                                ) : (
                                    <>
                                        <FaChartBar size={14} className="shrink-0" />
                                        <span>{atsButtonLabel}</span>
                                    </>
                                )}
                            </button>
                        )}
                        {showAiComingSoon && (
                            <button
                                type="button"
                                disabled
                                title="AI Resume Check is under development"
                                className={`${analysisButtonClass} bg-violet-600/10 text-violet-400/60 cursor-not-allowed`}
                            >
                                <FaBrain size={14} className="shrink-0" />
                                <span>{comingSoonButtonLabel}</span>
                            </button>
                        )}
                        {canAiCheck && (
                            <button
                                type="button"
                                onClick={handleAiCheck}
                                disabled={isAiChecking}
                                title={aiCheckResult?.status === 'completed' ? 'Re-run AI Resume Check' : 'Run AI Resume Check'}
                                className={`${analysisButtonClass} bg-violet-600/15 text-violet-300 hover:bg-violet-600/25 disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                {isAiChecking ? (
                                    <>
                                        <FaSpinner className="animate-spin shrink-0" size={14} />
                                        <span>Running…</span>
                                    </>
                                ) : (
                                    <>
                                        <FaBrain size={14} className="shrink-0" />
                                        <span>{aiButtonLabel}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentCard;
