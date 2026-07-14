/**
 * OpportunityCard - Compact card component for displaying opportunity summary
 * 
 * Displays essential info: title, category, status, deadline, and truncated description.
 * Clicking the card opens the detail modal (handled by parent via onView callback).
 * Edit/Delete buttons remain for quick actions.
 */
import React from 'react';
import { FaEdit, FaShareAlt, FaTrash, FaExternalLinkAlt, FaLayerGroup } from 'react-icons/fa';
import Card from '../common/Card';
import Button from '../common/Button';
import { getDaysRemaining, isOverdue, formatDate } from '../../utils/dateHelpers';
import { getRoundSummaryLabel, getRoundSummaryStyle } from '../../utils/roundHelpers';
import { getCampusModeLabel, CAMPUS_MODE_BADGE_STYLES } from '../../utils/opportunityHelpers';

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

/**
 * @param {Object} props
 * @param {Object} props.opportunity - The opportunity object to display
 * @param {Function} props.onView - Callback when card is clicked (receives full opportunity)
 * @param {Function} props.onEdit - Callback when Edit is clicked (receives opportunity.id)
 * @param {Function} props.onDelete - Callback when Delete is clicked (receives opportunity.id)
 * @param {Function} [props.onShare] - Callback when Share is clicked (receives full opportunity)
 */
const OpportunityCard = ({ opportunity, onView, onEdit, onDelete, onShare }) => {
  const daysRemaining = getDaysRemaining(opportunity.deadline);
  const overdue = isOverdue(opportunity.deadline);
  const roundSummary = getRoundSummaryLabel(opportunity);
  const campusModeLabel = getCampusModeLabel(opportunity.campus_mode);

  const handleCardClick = () => {
    if (onView) {
      onView(opportunity);
    }
  };

  return (
    <Card hover className="p-5">
      <div className="flex flex-col h-full">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div
            className="min-w-0 flex-1 cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick();
              }
            }}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-400 transition-colors">
              {opportunity.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(opportunity)}
                className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
                aria-label={`Share ${opportunity.title}`}
                title="Share internship"
              >
                <FaShareAlt size={13} />
              </button>
            )}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${categoryColors[opportunity.category] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
                }`}
            >
              {opportunity.category}
            </span>
          </div>
        </div>

        <div
          className="cursor-pointer flex-1 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
          onClick={handleCardClick}
          role="presentation"
        >
          {/* Description (truncated) */}
          {opportunity.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {opportunity.description}
            </p>
          )}

          {/* Deadline */}
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deadline: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(opportunity.deadline)}</span>
            </p>
            <p className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {overdue
                ? `Overdue by ${Math.abs(daysRemaining)} days`
                : `${daysRemaining} days remaining`
              }
            </p>
          </div>

          {/* Status Badge */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[opportunity.status] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
                }`}
            >
              {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
            </span>
            {roundSummary && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getRoundSummaryStyle(opportunity)}`}
              >
                <FaLayerGroup size={10} aria-hidden="true" />
                {roundSummary}
              </span>
            )}
            {campusModeLabel && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${CAMPUS_MODE_BADGE_STYLES[opportunity.campus_mode]}`}
              >
                {campusModeLabel}
              </span>
            )}
          </div>

          {/* External Link */}
          {opportunity.link && (
            <a
              href={opportunity.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline text-sm flex items-center mb-4 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <FaExternalLinkAlt className="mr-1.5" size={12} />
              View Opportunity
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="primary"
            onClick={(e) => { e.stopPropagation(); onEdit(opportunity.id); }}
            className="flex-1 flex items-center justify-center text-sm"
          >
            <FaEdit className="mr-1.5" size={14} />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={(e) => { e.stopPropagation(); onDelete(opportunity.id); }}
            className="flex-1 flex items-center justify-center text-sm"
          >
            <FaTrash className="mr-1.5" size={14} />
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default OpportunityCard;
