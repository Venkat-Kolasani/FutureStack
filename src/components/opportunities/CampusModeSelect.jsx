import React from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { CAMPUS_MODE_FILTER_OPTIONS } from '../../utils/opportunityHelpers';

const CampusModeSelect = ({ value, onChange, className }) => {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        value={value}
        onChange={onChange}
        className={className || "w-full sm:w-44 h-10 pl-3 pr-8 appearance-none bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"}
        aria-label="Filter by campus type"
      >
        {CAMPUS_MODE_FILTER_OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-white dark:bg-[#111827] text-gray-900 dark:text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 dark:text-gray-400">
        <FaChevronDown className="text-xs" />
      </div>
    </div>
  );
};

export default CampusModeSelect;
