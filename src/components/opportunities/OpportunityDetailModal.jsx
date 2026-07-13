/**
 * OpportunityDetailModal - Slide-out drawer showing full opportunity details
 * 
 * Features:
 * - Spacious layout with clear visual sections
 * - Full content display (no truncation)
 * - Attached documents for internships
 * - Fixed footer with Edit/Delete actions
 * - Responsive: drawer layout on all devices
 */
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    FaTimes,
    FaEdit,
    FaTrash,
    FaExternalLinkAlt,
    FaCalendarAlt,
    FaFileAlt,
    FaStickyNote,
    FaFilePdf,
    FaLink,
    FaFile,
    FaDownload,
    FaUsers,
    FaPlus,
    FaLayerGroup,
    FaGraduationCap,
} from 'react-icons/fa';
import Button from '../common/Button';
import RoundTimeline, { RoundTimelineSkeleton } from '../rounds/RoundTimeline';
import AddRoundModal from '../rounds/AddRoundModal';
import { getDaysRemaining, isOverdue, formatDate } from '../../utils/dateHelpers';
import { supportsDocuments, getCampusModeLabel, CAMPUS_MODE_BADGE_STYLES } from '../../utils/opportunityHelpers';
import {
    getNextRoundNumber,
    getRoundProgressStats,
    supportsInterviewRounds,
} from '../../utils/roundHelpers';
import { documentService, roundService } from '../../services/api';

// Status badge color mappings
const statusColors = {
    applied: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    shortlisted: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    interviewed: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    selected: 'bg-green-500/10 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

// Category badge color mappings
const categoryColors = {
    internship: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    hackathon: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
};

// Document type icons and colors
const documentTypeConfig = {
    resume: { icon: FaFilePdf, color: 'text-blue-400' },
    cover_letter: { icon: FaFileAlt, color: 'text-green-400' },
    portfolio: { icon: FaLink, color: 'text-purple-400' },
    other: { icon: FaFile, color: 'text-gray-600 dark:text-gray-400' }
};

/**
 * @param {Object} props
 * @param {Object} props.opportunity - The opportunity object to display
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onEdit - Callback when Edit is clicked (receives opportunity.id)
 * @param {Function} props.onDelete - Callback when Delete is clicked (receives opportunity.id)
 * @param {Function} props.onManage - Callback when Manage is clicked for hackathons (receives opportunity.id)
 * @param {Function} props.onPrep - Callback when Interview Prep is clicked for internships (receives opportunity.id)
 * @param {Function} props.onOpportunityUpdated - Callback when opportunity fields change (e.g. after round sync)
 */
const OpportunityDetailModal = ({
    opportunity,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onManage,
    onPrep,
    onOpportunityUpdated,
}) => {
    const [displayOpportunity, setDisplayOpportunity] = useState(opportunity);
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [rounds, setRounds] = useState([]);
    const [roundsLoading, setRoundsLoading] = useState(false);
    const [roundModalOpen, setRoundModalOpen] = useState(false);
    const [editingRound, setEditingRound] = useState(null);
    const [roundSaving, setRoundSaving] = useState(false);
    const [deletingRoundId, setDeletingRoundId] = useState(null);

    useEffect(() => {
        setDisplayOpportunity(opportunity);
    }, [opportunity]);

    // Fetch attached documents for internships
    useEffect(() => {
        if (isOpen && supportsDocuments(opportunity?.category) && opportunity?.id) {
            const fetchDocs = async () => {
                try {
                    setLoadingDocs(true);
                    const docs = await documentService.getByOpportunity(opportunity.id);
                    setDocuments(docs);
                } catch (error) {
                    console.error('Error fetching documents:', error);
                    setDocuments([]);
                    toast.error('Failed to load attached documents');
                } finally {
                    setLoadingDocs(false);
                }
            };
            fetchDocs();
        } else {
            setDocuments([]);
        }
    }, [isOpen, opportunity?.id, opportunity?.category]);

    useEffect(() => {
        if (!isOpen || !opportunity?.id || !supportsInterviewRounds(opportunity.category)) {
            setRounds([]);
            return;
        }

        let cancelled = false;

        const loadRounds = async () => {
            try {
                setRoundsLoading(true);
                const data = await roundService.list(opportunity.id);
                if (!cancelled) setRounds(data);
            } catch (error) {
                console.error('Error loading rounds:', error);
                if (!cancelled) {
                    setRounds([]);
                    toast.error('Failed to load interview rounds');
                }
            } finally {
                if (!cancelled) setRoundsLoading(false);
            }
        };

        loadRounds();
        return () => {
            cancelled = true;
        };
    }, [isOpen, opportunity?.id, opportunity?.category]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const applyRoundMutationResult = useCallback((result) => {
        if (result?.opportunity) {
            setDisplayOpportunity(result.opportunity);
            onOpportunityUpdated?.(result.opportunity);
        }
        if (result?.rounds) {
            setRounds(result.rounds);
        }
    }, [onOpportunityUpdated]);

    const roundStats = getRoundProgressStats(rounds);

    if (!isOpen || !displayOpportunity) return null;

    const daysRemaining = getDaysRemaining(displayOpportunity.deadline);
    const overdue = isOverdue(displayOpportunity.deadline);
    const showInterviewRounds = supportsInterviewRounds(displayOpportunity.category);
    const campusModeLabel = getCampusModeLabel(displayOpportunity.campus_mode);

    const handleOpenAddRound = () => {
        setEditingRound(null);
        setRoundModalOpen(true);
    };

    const handleEditRound = (round) => {
        setEditingRound(round);
        setRoundModalOpen(true);
    };

    const handleCloseRoundModal = () => {
        if (roundSaving) return;
        setRoundModalOpen(false);
        setEditingRound(null);
    };

    const handleRoundSubmit = async (payload) => {
        const wasEditing = Boolean(editingRound);

        try {
            setRoundSaving(true);
            const result = wasEditing
                ? await roundService.update(displayOpportunity.id, editingRound.id, payload)
                : await roundService.create(displayOpportunity.id, payload);

            applyRoundMutationResult(result);
            setRoundModalOpen(false);
            setEditingRound(null);
            if (result?.opportunity?.status !== 'rejected') {
                toast.success(wasEditing ? 'Round updated' : 'Round added');
            }
        } catch (error) {
            console.error('Error saving round:', error);
            toast.error(error.response?.data?.error || 'Failed to save round');
        } finally {
            setRoundSaving(false);
        }
    };

    const handleDeleteRound = async (round) => {
        try {
            setDeletingRoundId(round.id);
            const result = await roundService.delete(displayOpportunity.id, round.id);
            applyRoundMutationResult(result);
            toast.success('Round deleted');
        } catch (error) {
            console.error('Error deleting round:', error);
            toast.error(error.response?.data?.error || 'Failed to delete round');
        } finally {
            setDeletingRoundId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-white dark:bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Panel - slides in from right */}
            <div className="fixed inset-y-0 right-0 w-full sm:max-w-lg flex">
                <div className="relative w-full bg-white dark:bg-[#0A0A0A] shadow-2xl flex flex-col border-l border-gray-200 dark:border-white/10">

                    {/* Header */}
                    <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-white/10">
                        <div className="flex-1 pr-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {displayOpportunity.title}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[displayOpportunity.category] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'}`}>
                                    {displayOpportunity.category.charAt(0).toUpperCase() + displayOpportunity.category.slice(1)}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[displayOpportunity.status] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'}`}>
                                    {displayOpportunity.status.charAt(0).toUpperCase() + displayOpportunity.status.slice(1)}
                                </span>
                                {roundStats.total > 0 && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                        <FaLayerGroup size={10} aria-hidden="true" />
                                        {roundStats.total} round{roundStats.total !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {campusModeLabel && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${CAMPUS_MODE_BADGE_STYLES[displayOpportunity.campus_mode]}`}>
                                        {campusModeLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Deadline Section */}
                        <section>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                                <FaCalendarAlt size={14} />
                                <h3 className="text-sm font-medium uppercase tracking-wide">Deadline</h3>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                                <p className="text-gray-900 dark:text-white font-medium">
                                    {formatDate(displayOpportunity.deadline)}
                                </p>
                                <p className={`text-sm mt-1 ${overdue ? 'text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {overdue
                                        ? `Overdue by ${Math.abs(daysRemaining)} days`
                                        : `${daysRemaining} days remaining`
                                    }
                                </p>
                            </div>
                        </section>

                        {/* Description Section */}
                        {displayOpportunity.description && (
                            <section>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                                    <FaFileAlt size={14} />
                                    <h3 className="text-sm font-medium uppercase tracking-wide">Description</h3>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {displayOpportunity.description}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* Interview Pipeline (internships only) */}
                        {showInterviewRounds && (
                            <section>
                                <div className="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-400 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FaLayerGroup size={14} className="shrink-0 text-purple-400" />
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-700 dark:text-gray-300">
                                                Interview Pipeline
                                            </h3>
                                            {!roundsLoading && roundStats.total > 0 && (
                                                <p className="text-xs text-gray-500 normal-case tracking-normal mt-0.5">
                                                    {roundStats.total} round{roundStats.total !== 1 ? 's' : ''} logged
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleOpenAddRound}
                                        disabled={roundsLoading || roundSaving}
                                        className="!px-3 !py-1.5 text-xs shrink-0"
                                    >
                                        <FaPlus className="mr-1.5" size={12} />
                                        Add round
                                    </Button>
                                </div>
                                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4">
                                    {roundsLoading ? (
                                        <RoundTimelineSkeleton />
                                    ) : (
                                        <RoundTimeline
                                            rounds={rounds}
                                            currentRoundNumber={displayOpportunity.current_round_number}
                                            rejectedRoundNumber={displayOpportunity.rejected_round_number}
                                            onEditRound={handleEditRound}
                                            onDeleteRound={handleDeleteRound}
                                            onAddRound={handleOpenAddRound}
                                            deletingRoundId={deletingRoundId}
                                        />
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Attached Documents Section (Internships only) */}
                        {supportsDocuments(displayOpportunity.category) && (
                            <section>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                                    <FaFilePdf size={14} />
                                    <h3 className="text-sm font-medium uppercase tracking-wide">Attached Documents</h3>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
                                    {loadingDocs ? (
                                        <div className="p-4 text-center text-gray-500">
                                            <span className="animate-spin inline-block mr-2">⟳</span>
                                            Loading documents...
                                        </div>
                                    ) : documents.length > 0 ? (
                                        <div className="divide-y divide-white/10">
                                            {documents.map((doc) => {
                                                const config = documentTypeConfig[doc.type] || documentTypeConfig.other;
                                                const Icon = config.icon;
                                                return (
                                                    <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <Icon className={config.color} size={18} />
                                                            <div>
                                                                <p className="text-gray-900 dark:text-white text-sm font-medium">{doc.name}</p>
                                                                {doc.version && (
                                                                    <p className="text-gray-500 text-xs">{doc.version}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {doc.file_url && (
                                                            <a
                                                                href={doc.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm"
                                                            >
                                                                {doc.is_external ? <FaLink size={12} /> : <FaDownload size={12} />}
                                                                {doc.is_external ? 'Open' : 'Download'}
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 text-sm">
                                            No documents attached
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Notes Section */}
                        {displayOpportunity.notes && (
                            <section>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                                    <FaStickyNote size={14} />
                                    <h3 className="text-sm font-medium uppercase tracking-wide">Notes</h3>
                                </div>
                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {displayOpportunity.notes}
                                    </p>
                                </div>
                            </section>
                        )}

                        {/* External Link Section */}
                        {displayOpportunity.link && (
                            <section>
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                                    <FaExternalLinkAlt size={14} />
                                    <h3 className="text-sm font-medium uppercase tracking-wide">Application Link</h3>
                                </div>
                                <a
                                    href={displayOpportunity.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-white/10 transition-all"
                                >
                                    <FaExternalLinkAlt size={14} />
                                    Open Job Posting
                                </a>
                            </section>
                        )}
                    </div>

                    {/* Fixed Footer with Actions */}
                    <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A]">
                        <div className="flex gap-3">
                            {displayOpportunity.category === 'hackathon' && onManage && (
                                <Button
                                    variant="secondary"
                                    onClick={() => onManage(displayOpportunity.id)}
                                    className="flex-1"
                                >
                                    <FaUsers className="mr-2" size={14} />
                                    Manage Project
                                </Button>
                            )}
                            {displayOpportunity.category === 'internship' && onPrep && (
                                <Button
                                    variant="secondary"
                                    onClick={() => onPrep(displayOpportunity.id)}
                                    className="flex-1"
                                >
                                    <FaGraduationCap className="mr-2" size={14} />
                                    Interview Prep
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                onClick={() => onEdit(displayOpportunity.id)}
                                className="flex-1"
                            >
                                <FaEdit className="mr-2" size={14} />
                                Edit
                            </Button>
                            <Button
                                variant="danger"
                                onClick={() => onDelete(displayOpportunity.id)}
                                className="flex-1"
                            >
                                <FaTrash className="mr-2" size={14} />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <AddRoundModal
                isOpen={roundModalOpen}
                onClose={handleCloseRoundModal}
                onSubmit={handleRoundSubmit}
                roundNumber={getNextRoundNumber(rounds)}
                initialRound={editingRound}
                saving={roundSaving}
            />
        </div>
    );
};

export default OpportunityDetailModal;
