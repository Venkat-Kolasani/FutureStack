import {
  addLocalDays,
  formatLocalDate,
  HEATMAP_DAY_COUNT,
  startOfLocalDay,
} from '../../utils/heatmapHelpers';

const TRACKS = {
  dsa: {
    name: 'LeetCode / DSA',
    takeaways: [
      'Two pointers on a linked list finally clicked.',
      'Revisited binary search bounds instead of guessing mid.',
      'Heap solution beat the O(n log n) sort I started with.',
      'Drew the recursion tree before coding the DFS.',
      'Caught an off-by-one on the sliding window right pointer.',
    ],
  },
  dev: {
    name: 'Development',
    takeaways: [
      'Shipped the auth callback and wrote down the failure modes.',
      'Replaced a nested fetch with one aggregated query.',
      'Documented the PR so a teammate can review without guessing.',
      'Fixed a dark-mode contrast bug before it hit the demo.',
    ],
  },
  systemDesign: {
    name: 'System Design',
    takeaways: [
      'Sketched read-path caching before jumping to databases.',
      'Wrote the capacity estimate instead of hand-waving QPS.',
      'Compared queue vs pub/sub for the notification fan-out.',
    ],
  },
  mock: {
    name: 'Mock Interviews',
    takeaways: [
      'Talked through trade-offs out loud; still rushed the code.',
      'Behavioral story was too long — cut it to situation and result.',
      'Needed hints on the graph prompt; reviewing BFS next.',
    ],
  },
  reading: {
    name: 'Reading / Courses',
    takeaways: [
      'Finished the indexing chapter; btree vs hash is clearer now.',
      'Notes on CAP are still fuzzy — revisit with a concrete system.',
      'Watched a mock system-design and paused to redraw the board.',
    ],
  },
};

const TRACK_IDS = Object.keys(TRACKS);

const hashDate = (dateKey) => {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const unit = (hash, salt) => ((hash + salt * 9973) % 1000) / 1000;

const isExamGap = (date) => {
  const month = date.getMonth();
  const day = date.getDate();
  if (month === 3) return true;
  if (month === 11 && day >= 20) return true;
  if (month === 0 && day <= 5) return true;
  return false;
};

const weekdayIntensity = (date) => {
  const month = date.getMonth();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  if (isExamGap(date)) return isWeekend ? 0.04 : 0.08;
  if (isWeekend) {
    if (month === 6 || month === 7) return 0.45;
    return 0.22;
  }
  if (month === 0 || month === 1 || month === 7) return 0.88;
  if (month === 5 || month === 6) return 0.8;
  if (month === 2 || month === 4) return 0.72;
  return 0.6;
};

const pickTracks = (date, hash) => {
  const month = date.getMonth();
  const countRoll = unit(hash, 3);
  const count = countRoll > 0.82 ? 3 : countRoll > 0.55 ? 2 : 1;
  const preferred = month === 0 || month === 1
    ? ['dsa', 'reading']
    : month === 5 || month === 6
      ? ['dev', 'systemDesign', 'dsa']
      : month === 7
        ? ['dsa', 'mock', 'systemDesign']
        : ['dsa', 'reading', 'dev'];

  const chosen = [];
  preferred.forEach((id, index) => {
    if (chosen.length < count && unit(hash, 11 + index) > 0.28) chosen.push(id);
  });
  while (chosen.length < count) {
    const fallback = TRACK_IDS[(hash + chosen.length * 13) % TRACK_IDS.length];
    if (!chosen.includes(fallback)) chosen.push(fallback);
    else break;
  }
  return chosen;
};

/**
 * Deterministic mock year of placement prep — streaks, exam gaps, mixed tracks.
 */
export const generateMockProgressYear = (today = new Date()) => {
  const end = startOfLocalDay(today);
  const start = addLocalDays(end, -(HEATMAP_DAY_COUNT - 1));
  const entriesByDate = {};
  const heatmapData = [];

  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addLocalDays(cursor, 1)) {
    const date = formatLocalDate(cursor);
    const hash = hashDate(date);
    if (unit(hash, 1) > weekdayIntensity(cursor)) continue;

    const tracks = pickTracks(cursor, hash).map((id) => {
      const config = TRACKS[id];
      const takeaway = config.takeaways[hash % config.takeaways.length];
      return { id, name: config.name, takeaway };
    });

    if (tracks.length === 0) continue;

    entriesByDate[date] = tracks.map((track) => ({
      track: track.name,
      takeaway: track.takeaway,
    }));
    heatmapData.push({
      date,
      count: tracks.length,
      tracks: tracks.map((track) => track.name),
    });
  }

  return {
    heatmapData,
    entriesByDate,
    generatedFor: formatLocalDate(end),
  };
};
