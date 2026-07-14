import React from 'react';
import { FaTrash } from 'react-icons/fa';
import { formatDate } from '../../utils/dateHelpers';

const StatusCard = ({ opportunity, onStatusChange, onDelete }) => {
  const categoryColors = {
    internship: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    hackathon: 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    if (newStatus !== opportunity.status) {
      onStatusChange(opportunity.id, newStatus);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg p-4 mb-3 hover:shadow-blue-900/20 hover:border-blue-500/30 transition-all">
      {/* Header with Title and Delete Button */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white flex-1">{opportunity.title}</h4>
        {onDelete && (
          <button
            onClick={() => onDelete(opportunity.id)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 rounded-md hover:bg-red-500 ml-2"
            aria-label="Delete opportunity"
          >
            <FaTrash size={14} />
          </button>
        )}
      </div>

      {/* Category Badge */}
      <span
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-3 ${categoryColors[opportunity.category] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
          }`}
      >
        {opportunity.category}
      </span>

      {/* Deadline */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        <span className="font-medium">Deadline:</span> {formatDate(opportunity.deadline)}
      </p>

      {/* Status Dropdown */}
      <div>
        <label htmlFor={`status-${opportunity.id}`} className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          Update Status
        </label>
        <select
          id={`status-${opportunity.id}`}
          value={opportunity.status}
          onChange={handleStatusChange}
          className="w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="applied" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Applied</option>
          <option value="shortlisted" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Shortlisted</option>
          <option value="interviewed" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Interviewed</option>
          <option value="selected" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Selected</option>
          <option value="rejected" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">Rejected</option>
        </select>
      </div>
    </div>
  );
};

export default StatusCard;
