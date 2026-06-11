/**
 * OpportunityDetailModal - Full detail view for a single opportunity
 * 
 * Displays all fields including deadline with centralized urgency badge.
 * Uses getDeadlineUrgency() for consistent styling across the app.
 */
import React from 'react';
import { FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import Button from '../common/Button';
import { formatDate } from '../../utils/dateHelpers';
import { getDeadlineUrgency } from '../../utils/dateHelpers';

/**
 * @param {Object} props
 * @param {Object} props.opportunity - The full opportunity object to display
 * @param {boolean} props.isOpen - Controls modal visibility (required by parent components)
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onEdit - Callback when Edit button is clicked
 * @param {Function} [props.onDelete] - Kept for API compatibility with parent components
 * @param {Function} [props.onManage] - Kept for API compatibility with HackathonList
 */
const OpportunityDetailModal = ({ opportunity, isOpen, onClose, onEdit, onDelete, onManage }) => {
  if (!isOpen || !opportunity) return null;

  const urgency = getDeadlineUrgency(opportunity.deadline);
  const showUrgency = opportunity.status !== 'rejected' && opportunity.status !== 'selected';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">{opportunity.title}</h2>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
              opportunity.category === 'internship' 
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
            }`}>
              {opportunity.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {opportunity.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed">{opportunity.description}</p>
            </div>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deadline & Urgency */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Deadline</h3>
              <p className="text-white text-lg font-medium">{formatDate(opportunity.deadline)}</p>
              {showUrgency && (
                <p className={`text-sm font-semibold mt-1 ${urgency.className}`}>
                  {urgency.label}{timeText}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Status</h3>
              <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
                opportunity.status === 'applied' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                opportunity.status === 'shortlisted' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                opportunity.status === 'interviewed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                opportunity.status === 'selected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {opportunity.status}
              </span>
            </div>
          </div>

          {/* External Link */}
          {opportunity.link && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Application Link</h3>
              <a
                href={opportunity.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline transition-all"
              >
                <FaExternalLinkAlt className="mr-2" size={14} />
                View Original Posting
              </a>
            </div>
          )}

          {/* Notes */}
          {opportunity.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Personal Notes</h3>
              <p className="text-gray-300 bg-gray-800/50 p-4 rounded-lg border border-gray-700">{opportunity.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-800 sticky bottom-0 bg-gray-900">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onEdit && onEdit(opportunity.id)}>
            Edit Opportunity
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailModal;