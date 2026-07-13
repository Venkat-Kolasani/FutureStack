import React, { useState } from 'react';
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaForward,
  FaEdit,
  FaTrash,
  FaLayerGroup,
  FaPlus,
  FaCode,
  FaUsers,
  FaClipboardList,
  FaComments,
  FaUserTie,
  FaFlagCheckered,
  FaEllipsisH,
  FaFileAlt,
  FaLaptopCode,
} from 'react-icons/fa';
import { formatDate, getDaysRemaining } from '../../utils/dateHelpers';
import {
  getRoundProgressStats,
  getRoundResultLabel,
  getRoundTypeLabel,
  ROUND_RESULT_STYLES,
} from '../../utils/roundHelpers';

const RESULT_ICONS = {
  pending: FaClock,
  cleared: FaCheckCircle,
  rejected: FaTimesCircle,
  skipped: FaForward,
};

const ROUND_TYPE_ICONS = {
  resume_shortlisted: FaFileAlt,
  oa: FaClipboardList,
  assignment: FaCode,
  technical_assignment: FaLaptopCode,
  technical: FaCode,
  hr: FaUserTie,
  group_discussion: FaComments,
  managerial: FaUsers,
  final: FaFlagCheckered,
  other: FaEllipsisH,
};

const connectorColor = (result) => {
  if (result === 'cleared') return 'bg-green-500/40';
  if (result === 'rejected') return 'bg-red-500/40';
  if (result === 'skipped') return 'bg-gray-500/30';
  return 'bg-white/10';
};

const nodeRingClass = (round, isActive) => {
  if (round.result === 'rejected') {
    return 'border-red-400/60 bg-red-500/15 shadow-[0_0_12px_rgba(248,113,113,0.15)]';
  }
  if (isActive) {
    return 'border-blue-400 bg-blue-500/20 shadow-[0_0_14px_rgba(96,165,250,0.2)] animate-pulse';
  }
  if (round.result === 'cleared') {
    return 'border-green-500/40 bg-green-500/10';
  }
  return 'border-white/20 bg-black/5 dark:bg-white/5';
};

const formatScheduledHint = (scheduledDate) => {
  if (!scheduledDate) return null;
  const days = getDaysRemaining(scheduledDate);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1) return `In ${days} days`;
  if (days === -1) return 'Yesterday';
  return `${Math.abs(days)} days ago`;
};

export const RoundTimelineSkeleton = () => (
  <div className="space-y-4 animate-pulse" aria-hidden="true">
    <div className="h-2 bg-white/10 rounded-full w-full" />
    <div className="flex gap-4">
      <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 h-20 rounded-lg bg-white/10" />
    </div>
    <div className="flex gap-4">
      <div className="h-8 w-8 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 h-16 rounded-lg bg-white/10" />
    </div>
  </div>
);

const PipelineSummary = ({ rounds, currentRoundNumber, rejectedRoundNumber }) => {
  const stats = getRoundProgressStats(rounds);

  if (stats.total === 0) return null;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>
          {stats.cleared} cleared
          {stats.pending > 0 && ` · ${stats.pending} pending`}
          {stats.skipped > 0 && ` · ${stats.skipped} skipped`}
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{stats.progressPercent}% complete</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            rejectedRoundNumber ? 'bg-red-500/70' : 'bg-gradient-to-r from-blue-500/80 to-green-500/80'
          }`}
          style={{ width: `${rejectedRoundNumber ? 100 : stats.progressPercent}%` }}
        />
      </div>
      {rejectedRoundNumber ? (
        <p className="text-sm text-red-300 flex items-center gap-2">
          <FaTimesCircle className="shrink-0" size={14} />
          Stopped at Round {rejectedRoundNumber}
        </p>
      ) : currentRoundNumber ? (
        <p className="text-sm text-blue-200 flex items-center gap-2">
          <FaClock className="shrink-0" size={14} />
          Up next: Round {currentRoundNumber}
        </p>
      ) : stats.cleared === stats.total ? (
        <p className="text-sm text-green-300 flex items-center gap-2">
          <FaCheckCircle className="shrink-0" size={14} />
          All recorded rounds cleared
        </p>
      ) : null}
    </div>
  );
};

/**
 * Presentational vertical timeline for interview rounds.
 */
const RoundTimeline = ({
  rounds = [],
  currentRoundNumber = null,
  rejectedRoundNumber = null,
  onEditRound,
  onDeleteRound,
  onAddRound,
  deletingRoundId = null,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  if (sortedRounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-gradient-to-b from-white/[0.04] to-transparent px-5 py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 border border-purple-500/20">
          <FaLayerGroup className="text-purple-400" size={20} />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No interview rounds yet</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 max-w-[240px] mx-auto leading-relaxed">
          Track OA, technical, HR, and final rounds as you move through the hiring process.
        </p>
        {onAddRound && (
          <button
            type="button"
            onClick={onAddRound}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/20 hover:text-blue-200 transition-colors"
          >
            <FaPlus size={12} />
            Add first round
          </button>
        )}
      </div>
    );
  }

  const handleDeleteClick = (round) => {
    if (confirmDeleteId === round.id) {
      onDeleteRound?.(round);
      setConfirmDeleteId(null);
      return;
    }
    setConfirmDeleteId(round.id);
  };

  return (
    <div className="space-y-1">
      <PipelineSummary
        rounds={sortedRounds}
        currentRoundNumber={currentRoundNumber}
        rejectedRoundNumber={rejectedRoundNumber}
      />

      <ol className="space-y-0" aria-label="Interview rounds">
        {sortedRounds.map((round, index) => {
          const ResultIcon = RESULT_ICONS[round.result] || FaClock;
          const TypeIcon = ROUND_TYPE_ICONS[round.round_type] || FaEllipsisH;
          const isActive = currentRoundNumber === round.round_number;
          const isLast = index === sortedRounds.length - 1;
          const scheduledHint = formatScheduledHint(round.scheduled_date);
          const isDeleting = deletingRoundId === round.id;
          const isConfirmingDelete = confirmDeleteId === round.id;

          return (
            <li key={round.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[15px] top-9 h-[calc(100%-0.75rem)] w-0.5 rounded-full ${connectorColor(
                    round.result
                  )}`}
                  aria-hidden="true"
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${nodeRingClass(
                  round,
                  isActive
                )}`}
              >
                <ResultIcon
                  className={
                    round.result === 'cleared'
                      ? 'text-green-400'
                      : round.result === 'rejected'
                        ? 'text-red-400'
                        : round.result === 'skipped'
                          ? 'text-gray-600 dark:text-gray-400'
                          : 'text-blue-400'
                  }
                  size={13}
                  aria-hidden="true"
                />
              </div>

              <div
                className={`min-w-0 flex-1 rounded-xl border p-4 transition-colors ${
                  isActive
                    ? 'border-blue-500/30 bg-blue-500/[0.07]'
                    : round.result === 'rejected'
                      ? 'border-red-500/20 bg-red-500/[0.04]'
                      : 'border-gray-200 dark:border-white/10 bg-white/[0.04] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <TypeIcon className="text-gray-500 shrink-0" size={12} aria-hidden="true" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        Round {round.round_number}
                        <span className="font-normal text-gray-600 dark:text-gray-400"> · </span>
                        {getRoundTypeLabel(round.round_type)}
                      </p>
                    </div>
                    {round.scheduled_date && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {formatDate(round.scheduled_date)}
                        {scheduledHint && (
                          <span
                            className={`ml-1.5 ${
                              scheduledHint === 'Today' || scheduledHint === 'Tomorrow'
                                ? 'text-amber-400 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            ({scheduledHint})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      ROUND_RESULT_STYLES[round.result] ||
                      'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
                    }`}
                  >
                    {getRoundResultLabel(round.result)}
                  </span>
                </div>

                {round.notes && (
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed border-t border-white/5 pt-3">
                    {round.notes}
                  </p>
                )}

                {(onEditRound || onDeleteRound) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                    {onEditRound && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          onEditRound(round);
                        }}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors disabled:opacity-50"
                      >
                        <FaEdit size={11} />
                        Edit
                      </button>
                    )}
                    {onDeleteRound && (
                      isConfirmingDelete ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Delete round?</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(round)}
                            disabled={isDeleting}
                            className="font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(round)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <FaTrash size={11} />
                          Delete
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default RoundTimeline;
