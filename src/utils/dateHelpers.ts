export const parseLocalDate = (dateString?: string | null): Date | null => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getDaysRemaining = (deadline?: string | null): number => {
  if (!deadline) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = parseLocalDate(deadline);
  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) return 0;
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 0 : diffDays;
};

export const isOverdue = (deadline?: string | null): boolean => {
  if (!deadline) return false;
  return getDaysRemaining(deadline) < 0;
};

export const formatDate = (date?: string | null): string => {
  if (!date) return '';

  const dateObj = parseLocalDate(date);
  if (!dateObj || Number.isNaN(dateObj.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return dateObj.toLocaleDateString('en-US', options);
};

export const formatTime = (time?: string | null): string => {
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
