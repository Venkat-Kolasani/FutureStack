/**
 * OpportunityList - Grid component for rendering opportunity cards
 * 
 * Renders a responsive grid of OpportunityCard components.
 * Handles empty state and passes callbacks down to each card.
 */
import React from 'react';
import OpportunityCard from './OpportunityCard';

/**
 * @param {Object} props
 * @param {Array} props.opportunities - Array of opportunity objects to display
 * @param {Function} props.onView - Callback when a card is clicked (receives full opportunity)
 * @param {Function} props.onEdit - Callback when Edit is clicked (receives opportunity.id)
 * @param {Function} props.onDelete - Callback when Delete is clicked (receives opportunity.id)
 * @param {Function} [props.onShare] - Callback when Share is clicked (receives full opportunity)
 */
const OpportunityList = ({ opportunities, onView, onEdit, onDelete, onShare }) => {
  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="text-center py-16 sm:py-20">
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">No opportunities found</p>
        <p className="text-gray-500 text-sm">Add your first opportunity to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {opportunities.map((opportunity) => (
        <OpportunityCard
          key={opportunity.id}
          opportunity={opportunity}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onShare={onShare}
        />
      ))}
    </div>
  );
};

export default OpportunityList;
