/**
 * Parse YYYY-MM-DD as a local calendar date (avoids UTC shift from Date.parse).
 * @param {string} dateString
 * @returns {Date}
 */
const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Calculate days remaining until a deadline
 * @param {string} deadline - Date string in YYYY-MM-DD format
 * @returns {number} - Number of days remaining (negative if overdue)
 */
export const getDaysRemaining = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = parseLocalDate(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Check if a deadline is overdue
 * @param {string} deadline - Date string in YYYY-MM-DD format
 * @returns {boolean} - True if overdue
 */
export const isOverdue = (deadline) => {
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
