import React from 'react';
import StatusCard from './StatusCard';

const StatusColumn = ({ status, opportunities, onStatusChange, onDelete }) => {
  // Status display configuration
  const statusConfig = {
    applied: {
      title: 'Applied',
      color: 'bg-blue-500/5 border-blue-500/20',
      headerColor: 'bg-blue-600',
    },
    shortlisted: {
      title: 'Shortlisted',
      color: 'bg-yellow-500/5 border-yellow-500/20',
      headerColor: 'bg-yellow-600',
    },
    interviewed: {
      title: 'Interviewed',
      color: 'bg-purple-500/5 border-purple-500/20',
      headerColor: 'bg-purple-600',
    },
    selected: {
      title: 'Selected',
      color: 'bg-green-500/5 border-green-500/20',
      headerColor: 'bg-green-600',
    },
    rejected: {
      title: 'Rejected',
      color: 'bg-red-500/5 border-red-500/20',
      headerColor: 'bg-red-600',
    },
    ghosted: {
      title: 'Ghosted',
      color: 'bg-slate-500/5 border-slate-500/20',
      headerColor: 'bg-slate-600',
    },
  };

  const config = statusConfig[status] || {
    title: status,
    color: 'bg-gray-500/5 border-gray-500/20',
    headerColor: 'bg-gray-600',
  };

  const count = opportunities.length;

  return (
    <div className="flex-shrink-0 w-72 sm:w-80">
      {/* Column Header */}
      <div className={`${config.headerColor} text-gray-900 dark:text-white rounded-t-lg p-3 sm:p-4`}>
        <h3 className="font-semibold text-base sm:text-lg flex items-center justify-between">
          <span>{config.title}</span>
          <span className="bg-white bg-opacity-30 px-2 py-1 rounded-full text-xs sm:text-sm font-bold">
            {count}
          </span>
        </h3>
      </div>

      {/* Column Content */}
      <div className={`${config.color} border-2 border-t-0 rounded-b-lg p-3 sm:p-4 min-h-[400px] max-h-[600px] overflow-y-auto`}>
        {opportunities.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-8">No opportunities</p>
        ) : (
          opportunities.map((opportunity) => (
            <StatusCard
              key={opportunity.id}
              opportunity={opportunity}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default StatusColumn;
