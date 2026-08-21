import { useMemo, useState } from 'react';
import SEO from '../components/seo/SEO';
import Card from '../components/common/Card';
import HeatmapGrid from '../components/progress/HeatmapGrid';
import { generateMockProgressYear } from '../components/progress/heatmapMockData';
import { formatDate, parseLocalDate } from '../utils/dateHelpers';
import {
  calculateCurrentStreak,
  countLoggedDays,
  getBestWeekLoggedDays,
} from '../utils/heatmapHelpers';

const TRACK_ACCENTS = {
  'LeetCode / DSA': 'bg-teal-400',
  Development: 'bg-blue-400',
  'System Design': 'bg-violet-400',
  'Mock Interviews': 'bg-amber-400',
  'Reading / Courses': 'bg-cyan-400',
};

const weekdayLabel = (dateKey) => {
  const parsed = parseLocalDate(dateKey);
  if (!parsed || Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { weekday: 'long' });
};

const ProgressPreview = () => {
  const mock = useMemo(() => generateMockProgressYear(new Date()), []);
  const todayKey = mock.generatedFor;
  const mostRecentLogged = [...mock.heatmapData].reverse().find((day) => day.count > 0)?.date;
  const [selectedDate, setSelectedDate] = useState(mostRecentLogged || todayKey);
  const selectedEntries = mock.entriesByDate[selectedDate] || [];
  const isToday = selectedDate === todayKey;

  const streak = calculateCurrentStreak(mock.heatmapData);
  const loggedDays = countLoggedDays(mock.heatmapData);
  const bestWeek = getBestWeekLoggedDays(mock.heatmapData);

  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
      <SEO
        title="Preparation log"
        description="Design preview of the Progress Logger heatmap. Mock data only."
        canonical="/progress"
        noindex={true}
      />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Preparation log
              </h1>
              <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">
                Preview
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              A year of placement prep, not just applications.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 sm:gap-5">
          <Card className="p-0 overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-gray-200 px-5 py-5 dark:border-white/[0.07] sm:px-6">
              <div>
                <p className="text-3xl sm:text-[2.15rem] font-semibold tracking-tight text-gray-900 dark:text-white">
                  {loggedDays}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  prep days in the last year
                </p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                    Streak
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {streak} {streak === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                    Best week
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {bestWeek} of 7 days
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <HeatmapGrid
                data={mock.heatmapData}
                selectedDate={selectedDate}
                onDaySelect={setSelectedDate}
              />
            </div>
          </Card>

          <Card className="p-5 sm:p-6 xl:sticky xl:top-24 h-fit">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
              {isToday ? 'Today' : 'Journal'}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {formatDate(selectedDate) || selectedDate}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {weekdayLabel(selectedDate)}
              {selectedEntries.length > 0
                ? ` · ${selectedEntries.length} ${selectedEntries.length === 1 ? 'log' : 'logs'}`
                : ' · no logs'}
            </p>

            {selectedEntries.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-white/10">
                <p className="text-sm text-gray-600 dark:text-gray-300">No prep logged.</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Empty days stay on the grid so a broken streak is honest.
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {selectedEntries.map((entry) => (
                  <li key={`${selectedDate}-${entry.track}`} className="flex gap-3">
                    <span
                      className={`mt-1.5 h-8 w-0.5 shrink-0 rounded-full ${TRACK_ACCENTS[entry.track] || 'bg-gray-400'}`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                        {entry.track}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {entry.takeaway}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProgressPreview;
