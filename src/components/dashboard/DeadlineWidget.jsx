/**
 * DeadlineWidget - Dashboard widget showing upcoming deadlines with urgency indicators
 * 
 * Displays a list of opportunities due within the next 7 days, sorted by deadline.
 * Uses centralized getDeadlineUrgency() for consistent styling across the app.
 */
import React from 'react';
import Card from '../common/Card';
import { formatDate } from '../../utils/dateHelpers';
import { getDeadlineUrgency } from '../../utils/dateHelpers';

/**
 * @param {Object} props
 * @param {Array} props.deadlines - List of opportunity objects to display
 * @param {Function} props.onDelete - Callback when delete button is clicked (kept for API compatibility)
 */
const DeadlineWidget = ({ deadlines, onDelete }) => {
  // Filter out null deadlines and inactive statuses, then sort by date
  const upcomingDeadlines = deadlines
    .filter(opp => opp.deadline && opp.status !== 'rejected' && opp.status !== 'selected')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5);

  if (upcomingDeadlines.length === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
        <p className="text-gray-400 text-sm">No upcoming deadlines in the next 7 days.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Upcoming Deadlines</h3>
      <div className="space-y-3">
        {upcomingDeadlines.map((opportunity) => {
          const urgency = getDeadlineUrgency(opportunity.deadline);
          
          // Calculate time context for the badge
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(opportunity.deadline);
          due.setHours(0, 0, 0, 0);
          const days = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
          
          let timeText = '';
          if (urgency.level === 'expired') timeText = ` (Overdue by ${Math.abs(days)} days)`;
          else if (urgency.level === 'today') timeText = ' (Today)';
          else if (urgency.level === 'soon') timeText = ` (${days} days left)`;

          return (
            <div
              key={opportunity.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors group"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                  {opportunity.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(opportunity.deadline)}
                </p>
              </div>
              
              {/* Urgency Badge with Time Context */}
              <span className={`text-xs font-semibold whitespace-nowrap px-2 py-1 rounded ${urgency.className}`}>
                {urgency.label}{timeText}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DeadlineWidget;