import { parseLocalDate } from './dateHelpers';

export const HEATMAP_DAY_COUNT = 365;
export const HEATMAP_WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export const HEATMAP_INTENSITY_CLASSES = [
  'bg-gray-100 dark:bg-white/10',
  'bg-emerald-200 dark:bg-emerald-900/80',
  'bg-emerald-400 dark:bg-emerald-600',
  'bg-emerald-600 dark:bg-emerald-400',
];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a Date as YYYY-MM-DD in the local calendar, never UTC.
 */
export const formatLocalDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfLocalDay = (date = new Date()) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
);

export const addLocalDays = (date, days) => (
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
);

/** Monday of the week containing `date` (local calendar). */
export const getMondayStart = (date) => {
  const start = startOfLocalDay(date);
  const mondayOffset = (start.getDay() + 6) % 7;
  return addLocalDays(start, -mondayOffset);
};

/**
 * 0 empty, 1 = one log, 2 = two or three, 3 = four or more.
 */
export const getIntensityLevel = (count) => {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  return 3;
};

export const indexHeatmapData = (data = []) => {
  const byDate = new Map();

  data.forEach((item) => {
    if (!item?.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return;

    const count = Number(item.count);
    const nextCount = Number.isFinite(count) ? Math.max(0, count) : 0;
    const tracks = Array.isArray(item.tracks)
      ? item.tracks.filter((track) => typeof track === 'string' && track.trim())
      : [];

    const existing = byDate.get(item.date);
    if (!existing) {
      byDate.set(item.date, {
        date: item.date,
        count: nextCount,
        tracks: [...new Set(tracks)],
      });
      return;
    }

    existing.count += nextCount;
    tracks.forEach((track) => {
      if (!existing.tracks.includes(track)) existing.tracks.push(track);
    });
  });

  return byDate;
};

const buildMonthLabels = (weeks) => {
  const labels = weeks.map((days, weekIndex) => {
    const monthStart = days.find((day) => day.dayOfMonth === 1);
    if (monthStart) {
      return MONTH_LABELS[monthStart.month];
    }

    if (weekIndex === 0) {
      const firstVisible = days.find((day) => !day.isPadding) || days[0];
      return firstVisible ? MONTH_LABELS[firstVisible.month] : null;
    }

    return null;
  });

  return labels.map((label, index) => {
    if (!label) return null;
    if (index > 0 && labels[index - 1]) return null;
    return label;
  });
};

/**
 * Build a Monday-start, week-aligned grid covering the last 365 local days.
 * Days outside the range are padding so month columns stay aligned.
 */
export const buildHeatmapGrid = (data = [], options = {}) => {
  const today = startOfLocalDay(options.today || new Date());
  const dayCount = options.dayCount || HEATMAP_DAY_COUNT;
  const rangeStart = addLocalDays(today, -(dayCount - 1));
  const gridStart = getMondayStart(rangeStart);
  const gridEnd = addLocalDays(getMondayStart(today), 6);
  const todayKey = formatLocalDate(today);
  const byDate = indexHeatmapData(data);

  const weeks = [];
  let week = [];
  let cursor = gridStart;

  while (cursor.getTime() <= gridEnd.getTime()) {
    const date = formatLocalDate(cursor);
    const inRange = cursor.getTime() >= rangeStart.getTime() && cursor.getTime() <= today.getTime();
    const entry = byDate.get(date);
    const count = inRange ? (entry?.count || 0) : 0;

    week.push({
      date,
      count,
      tracks: inRange ? (entry?.tracks || []) : [],
      intensity: inRange ? getIntensityLevel(count) : null,
      isPadding: !inRange,
      isToday: date === todayKey,
      weekday: (cursor.getDay() + 6) % 7,
      month: cursor.getMonth(),
      dayOfMonth: cursor.getDate(),
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }

    cursor = addLocalDays(cursor, 1);
  }

  return {
    weeks,
    monthLabels: buildMonthLabels(weeks),
    today: todayKey,
    rangeStart: formatLocalDate(rangeStart),
    rangeEnd: todayKey,
  };
};

export const calculateCurrentStreak = (data = [], options = {}) => {
  const today = startOfLocalDay(options.today || new Date());
  const byDate = indexHeatmapData(data);
  const todayLogged = (byDate.get(formatLocalDate(today))?.count || 0) > 0;
  let cursor = todayLogged ? today : addLocalDays(today, -1);
  let streak = 0;

  while ((byDate.get(formatLocalDate(cursor))?.count || 0) > 0) {
    streak += 1;
    cursor = addLocalDays(cursor, -1);
    if (streak > HEATMAP_DAY_COUNT + 7) break;
  }

  return streak;
};

export const countLoggedDays = (data = []) => (
  [...indexHeatmapData(data).values()].filter((day) => day.count > 0).length
);

export const getBestWeekLoggedDays = (data = [], options = {}) => {
  const { weeks } = buildHeatmapGrid(data, options);
  return weeks.reduce((best, week) => {
    const loggedDays = week.filter((day) => !day.isPadding && day.count > 0).length;
    return Math.max(best, loggedDays);
  }, 0);
};

export const formatHeatmapTooltip = (day) => {
  if (!day || day.isPadding) return '';

  const parsed = parseLocalDate(day.date);
  if (!parsed || Number.isNaN(parsed.getTime())) return '';

  const dateLabel = parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const logWord = day.count === 1 ? 'log' : 'logs';
  return `${dateLabel} · ${day.count} ${logWord}`;
};

export const getCellAriaLabel = (day) => {
  const summary = formatHeatmapTooltip(day);
  if (!summary) return '';
  if (day.tracks?.length) {
    return `${summary}. ${day.tracks.join(', ')}`;
  }
  return summary;
};
