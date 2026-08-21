import { useMemo, useState } from 'react';
import { FaBookOpen, FaCalendarCheck, FaFire, FaTrophy } from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import Card from '../components/common/Card';
import HeatmapGrid from '../components/progress/HeatmapGrid';
import { generateMockProgressYear } from '../components/progress/heatmapMockData';
import { formatDate } from '../utils/dateHelpers';
import {
  calculateCurrentStreak,
  countLoggedDays,
  getBestWeekLoggedDays,
} from '../utils/heatmapHelpers';

const TRACK_STYLES = {
  'LeetCode / DSA': 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  Development: 'bg-blue-500/10 text-blue-800 dark:text-blue-300',
  'System Design': 'bg-violet-500/10 text-violet-800 dark:text-violet-300',
  'Mock Interviews': 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  'Reading / Courses': 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300',
};

const SummaryTile = ({ label, value, hint, icon: Icon }) => (
  <Card className="p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
      <div className="rounded-xl bg-gray-100 p-2.5 text-gray-700 dark:bg-white/10 dark:text-gray-200">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
    </div>
  </Card>
);

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
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Design preview — mock data. Tracks, logging, and the API are not wired yet.
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Preparation log
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            A year of placement prep, not just applications.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <SummaryTile
            label="Current streak"
            value={streak}
            hint={streak === 1 ? 'day logged' : 'consecutive days'}
            icon={FaFire}
          />
          <SummaryTile
            label="Days logged"
            value={loggedDays}
            hint="of the last 365 days"
            icon={FaCalendarCheck}
          />
          <SummaryTile
            label="Best week"
            value={`${bestWeek}/7`}
            hint="most days logged in one week"
            icon={FaTrophy}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-4 sm:gap-6">
          <Card className="p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Darker cells mean more tracks logged that day. Click a day to reread what you learned.
              </p>
            </div>
            <HeatmapGrid
              data={mock.heatmapData}
              selectedDate={selectedDate}
              onDaySelect={setSelectedDate}
            />
          </Card>

          <Card className="p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {isToday ? 'Today' : 'Selected day'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(selectedDate) || selectedDate}
            </h2>

            {selectedEntries.length === 0 ? (
              <div className="mt-6 text-center">
                <FaBookOpen className="mx-auto h-6 w-6 text-gray-400" aria-hidden="true" />
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">No prep logged.</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Empty days stay visible so gaps in a streak are honest.
                </p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {selectedEntries.map((entry) => (
                  <li
                    key={`${selectedDate}-${entry.track}`}
                    className="rounded-xl border border-gray-200 dark:border-white/10 p-3"
                  >
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${TRACK_STYLES[entry.track] || 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200'}`}>
                      {entry.track}
                    </span>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{entry.takeaway}</p>
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
