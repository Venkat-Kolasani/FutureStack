export const getDeadlineUrgency = (deadline) => {
  if (!deadline) return { level: 'none', label: '', className: '' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(deadline);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { level: 'expired', label: 'Expired', className: 'text-red-500 font-bold' };
  }
  if (diffDays === 0) {
    return { level: 'today', label: 'Due Today', className: 'text-red-500 font-bold' };
  }
  if (diffDays <= 3) {
    return { level: 'soon', label: 'Due Soon', className: 'text-yellow-500 font-semibold' };
  }
  
  return { level: 'upcoming', label: 'Upcoming', className: 'text-green-500' };
};