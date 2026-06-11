/**
 * OpportunityCard - Compact card component for displaying opportunity summary
 * 
 * Displays essential info: title, category, status, deadline, and truncated description.
 * Clicking the card opens the detail modal (handled by parent via onView callback).
 * Edit/Delete buttons remain for quick actions.
 */
import React from 'react';
import { FaEdit, FaTrash, FaExternalLinkAlt } from 'react-icons/fa';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatDate } from '../../utils/dateHelpers';
import { getDeadlineUrgency } from '../../utils/dateHelpers'; 

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
 */
const OpportunityCard = ({ opportunity, onView, onEdit, onDelete }) => {
  const handleCardClick = () => {
    if (onView) {
      onView(opportunity);
    }
  };

  return (
    <Card hover className="p-5">
      <div className="flex flex-col h-full">
        {/* Clickable area for viewing details */}
        <div
          className="cursor-pointer flex-1 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded-lg"
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
          {/* Header with badges */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-white flex-1 mr-2 hover:text-blue-400 transition-colors">
              {opportunity.title}
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${categoryColors[opportunity.category] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}
            >
              {opportunity.category}
            </span>
          </div>

          {/* Description (truncated) */}
          {opportunity.description && (
            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
              {opportunity.description}
            </p>
          )}

          {/* Deadline & Urgency Badge */}
          <div className="mb-3">
            <p className="text-sm text-gray-400">
              Deadline: <span className="font-medium text-gray-300">{formatDate(opportunity.deadline)}</span>
            </p>
            
            {/* Show urgency badge only if not rejected/selected */}
            {opportunity.status !== 'rejected' && opportunity.status !== 'selected' && (
              <p className={`text-sm font-medium mt-1 ${getDeadlineUrgency(opportunity.deadline).className}`}>
                {getDeadlineUrgency(opportunity.deadline).label}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[opportunity.status] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}
            >
              {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
            </span>
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
        <div className="flex gap-2 mt-auto pt-2">
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