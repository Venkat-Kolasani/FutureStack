import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLayerGroup, FaCalendarCheck } from 'react-icons/fa';
import Card from '../common/Card';
import { formatDate, getDaysRemaining } from '../../utils/dateHelpers';
import { getRoundTypeLabel } from '../../utils/roundHelpers';

const UpcomingInterviewsWidget = ({ interviews = [], loading = false }) => {
  const navigate = useNavigate();

  const hasUrgent = interviews.some((item) => {
    const days = getDaysRemaining(item.scheduledDate);
    return days >= 0 && days <= 1;
  });

  if (loading) {
    return (
      <Card className="p-4 sm:p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-14 bg-black/5 dark:bg-white/5 rounded-lg" />
          <div className="h-14 bg-black/5 dark:bg-white/5 rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <FaLayerGroup className="mr-2 text-purple-400" />
          Upcoming Interviews
        </h3>
        {hasUrgent && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200">
            <FaCalendarCheck size={10} aria-hidden="true" />
            Soon
          </span>
        )}
      </div>

      {interviews.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400 text-center py-4 text-sm">
          No scheduled interview rounds. Add a date when you log a pending round on an internship.
        </p>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {interviews.slice(0, 5).map((item) => {
            const days = getDaysRemaining(item.scheduledDate);
            const urgencyClass =
              days < 0
                ? 'border-gray-500/40 bg-gray-500/10'
                : days <= 1
                  ? 'border-amber-500/40 bg-amber-500/10'
                  : days <= 3
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-blue-500/40 bg-blue-500/10';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate('/internships')}
                className={`w-full text-left rounded-lg border-l-4 p-3 transition-all hover:brightness-110 ${urgencyClass}`}
              >
                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.opportunityTitle}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  Round {item.roundNumber} · {getRoundTypeLabel(item.roundType)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {formatDate(item.scheduledDate)}
                  {days === 0 && ' · Today'}
                  {days === 1 && ' · Tomorrow'}
                  {days > 1 && ` · In ${days} days`}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default UpcomingInterviewsWidget;
