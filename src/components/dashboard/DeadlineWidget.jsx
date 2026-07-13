import React from 'react';
import { FaClock, FaExclamationTriangle, FaTrash } from 'react-icons/fa';
import Card from '../common/Card';
import { getDaysRemaining, isOverdue, formatDate } from '../../utils/dateHelpers';

const DeadlineWidget = ({ deadlines, onDelete }) => {
  if (!deadlines || deadlines.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FaClock className="mr-2 text-blue-400" />
          Upcoming Deadlines
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-center py-4 text-sm sm:text-base">No upcoming deadlines</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <FaClock className="mr-2 text-blue-400" />
        Upcoming Deadlines
      </h3>
      <div className="space-y-2 sm:space-y-3">
        {deadlines.map((opportunity) => {
          const daysRemaining = getDaysRemaining(opportunity.deadline);
          const overdue = isOverdue(opportunity.deadline);

          return (
            <div
              key={opportunity.id}
              className={`p-3 sm:p-4 rounded-lg border-l-4 transition-all hover:shadow-md ${overdue
                  ? 'bg-red-500/10 border-red-500'
                  : daysRemaining <= 3
                    ? 'bg-yellow-500/10 border-yellow-500'
                    : 'bg-blue-500/10 border-blue-500'
                }`}
            >
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">{opportunity.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {formatDate(opportunity.deadline)}
                  </p>
                </div>
                <div className="flex items-start gap-1.5 sm:gap-2 flex-shrink-0">
                  <div className="text-right">
                    {overdue ? (
                      <div className="flex items-center text-red-400">
                        <FaExclamationTriangle className="mr-1" size={12} />
                        <span className="text-xs sm:text-sm font-semibold whitespace-nowrap">Overdue</span>
                      </div>
                    ) : (
                      <span
                        className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${daysRemaining <= 3 ? 'text-yellow-400' : 'text-blue-400'
                          }`}
                      >
                        {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1 capitalize">
                      {opportunity.category}
                    </p>
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(opportunity.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-1.5 rounded-md hover:bg-red-900 hover:bg-opacity-30"
                      aria-label="Delete opportunity"
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DeadlineWidget;
