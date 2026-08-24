import {
  addLocalDays,
  calculateCurrentStreak,
  formatLocalDate,
  indexHeatmapData,
  startOfLocalDay,
} from './heatmapHelpers';

export const calculateLongestStreak = (data = [], options = {}) => {
  const indexed = indexHeatmapData(data);
  const today = startOfLocalDay(options.today || new Date());
  let longest = 0;
  let current = 0;

  for (let offset = 364; offset >= 0; offset -= 1) {
    const key = formatLocalDate(addLocalDays(today, -offset));
    if ((indexed.get(key)?.count || 0) > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
};

export const calculateTrackStreak = (logs = [], options = {}) => {
  const heatmapData = logs
    .filter((log) => log.didLog)
    .map((log) => ({ date: log.logDate, count: 1 }));
  return calculateCurrentStreak(heatmapData, options);
};

export const lastLoggedDate = (logs = []) => {
  const dated = logs
    .filter((log) => log.didLog && log.logDate)
    .map((log) => log.logDate)
    .sort();
  return dated[dated.length - 1] || null;
};
