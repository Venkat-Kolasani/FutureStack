import React from 'react';
import { formatDate } from '../../utils/dateHelpers';
import {
  getRoundResultLabel,
  getRoundTypeLabel,
  ROUND_RESULT_STYLES,
} from '../../utils/roundHelpers';

/**
 * Compact read-only round stepper for public share pages.
 */
const RoundTimelineReadOnly = ({ rounds = [] }) => {
  if (!rounds.length) {
    return null;
  }

  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  return (
    <ol className="mt-4 space-y-2" aria-label="Interview pipeline">
      {sorted.map((round) => (
        <li
          key={`${round.roundNumber}-${round.roundType}`}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
        >
          <span className="font-medium text-gray-900 dark:text-white">Round {round.roundNumber}</span>
          <span className="text-gray-600 dark:text-gray-400">·</span>
          <span className="text-gray-700 dark:text-gray-300">{getRoundTypeLabel(round.roundType)}</span>
          {round.scheduledDate && (
            <>
              <span className="text-gray-500">·</span>
              <span className="text-gray-600 dark:text-gray-400">{formatDate(round.scheduledDate)}</span>
            </>
          )}
          <span
            className={`ml-auto rounded-full border px-2 py-0.5 text-xs font-medium ${
              ROUND_RESULT_STYLES[round.result] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
            }`}
          >
            {getRoundResultLabel(round.result)}
          </span>
        </li>
      ))}
    </ol>
  );
};

export default RoundTimelineReadOnly;
