/**
 * Parse YYYY-MM-DD as a local calendar date (avoids UTC shift from Date.parse).
 * @param {string} dateString
 * @returns {Date}
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Calculate days remaining until a deadline
 * @param {string} deadline - Date string in YYYY-MM-DD format
 * @returns {number} - Number of days remaining (negative if overdue)
 */
export const getDaysRemaining = (deadline) => {
  if (!deadline) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = parseLocalDate(deadline);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return 0;
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  // Math.round safely handles daylight saving adjustments (+/- 1 hr shifts)
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Clean up JavaScript's native -0 edge case
  return diffDays === 0 ? 0 : diffDays;
};

/**
 * Check if a deadline is overdue
 * @param {string} deadline - Date string in YYYY-MM-DD format
 * @returns {boolean} - True if overdue
 */
export const isOverdue = (deadline) => {
  if (!deadline) return false;
  return getDaysRemaining(deadline) < 0;
};

/**
 * Format date to readable string
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  const dateObj = parseLocalDate(date);
  if (!dateObj || isNaN(dateObj.getTime())) return '';

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
};

/**
 * Format a database TIME value without applying a timezone conversion.
 */
export const formatTime = (time) => {
  if (!time) return '';

  const [hoursText, minutesText] = time.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};
