import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import SEO from '../components/seo/SEO';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import HeatmapGrid from '../components/progress/HeatmapGrid';
import TrackCard from '../components/progress/TrackCard';
import LogModal from '../components/progress/LogModal';
import CreateTrackModal from '../components/progress/CreateTrackModal';
import LogHistory from '../components/progress/LogHistory';
import { progressService } from '../services/api';
import { formatDate } from '../utils/dateHelpers';
import {
  calculateCurrentStreak,
  countLoggedDays,
  formatLocalDate,
  getBestWeekLoggedDays,
} from '../utils/heatmapHelpers';
import { calculateLongestStreak, calculateTrackStreak, lastLoggedDate } from '../utils/progressHelpers';
import { TRACK_TEMPLATES } from '../utils/progressTemplates';

const weekdayLabel = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'long' });
};

const Progress = () => {
  const todayKey = formatLocalDate(new Date());
  const [tracks, setTracks] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [logsByTrack, setLogsByTrack] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [dayLogs, setDayLogs] = useState([]);
  const [historyTrack, setHistoryTrack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(null);
  const [existingLog, setExistingLog] = useState(null);
  const dayLogsRequestId = useRef(0);

  const activeTracks = useMemo(() => tracks.filter((track) => track.isActive !== false), [tracks]);

  const loadBoard = useCallback(async () => {
    const [nextTracks, nextHeatmap] = await Promise.all([
      progressService.listTracks(),
      progressService.getHeatmap(todayKey),
    ]);
    setTracks(nextTracks);
    setHeatmap(nextHeatmap);

    const logEntries = await Promise.all(
      nextTracks.map(async (track) => {
        const logs = await progressService.listLogsByTrack(track.id);
        return [track.id, logs];
      })
    );
    setLogsByTrack(Object.fromEntries(logEntries));
  }, [todayKey]);

  const loadDayLogs = useCallback(async (date) => {
    const requestId = ++dayLogsRequestId.current;
    const logs = await progressService.listLogsByDate(date);
    if (requestId === dayLogsRequestId.current) {
      setDayLogs(logs);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadBoard();
        if (!cancelled) await loadDayLogs(todayKey);
      } catch (error) {
        console.error('Unable to load progress logger', error);
        toast.error('Unable to load your prep log. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBoard, loadDayLogs, todayKey]);

  const refreshAfterWrite = async (date = selectedDate) => {
    await loadBoard();
    await loadDayLogs(date);
  };

  const openLog = (track = null, date = selectedDate) => {
    const targetTrack = track || activeTracks[0] || null;
    const logs = targetTrack ? (logsByTrack[targetTrack.id] || []) : [];
    const match = logs.find((log) => log.logDate === date)
      || dayLogs.find((log) => log.trackId === targetTrack?.id && log.logDate === date)
      || null;
    setActiveTrack(targetTrack);
    setExistingLog(match);
    setSelectedDate(date);
    setLogOpen(true);
  };

  const handleSaveLog = async (payload) => {
    try {
      setSaving(true);
      await progressService.saveLog(payload);
      setLogOpen(false);
      setSelectedDate(payload.logDate);
      await refreshAfterWrite(payload.logDate);
      toast.success(payload.didLog ? 'Prep logged.' : 'Off day saved.');
    } catch (error) {
      console.error('Unable to save progress log', error);
      toast.error('Unable to save that log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTrack = async (payload) => {
    try {
      setSaving(true);
      const created = await progressService.createTrack(payload);
      setCreateOpen(false);
      await loadBoard();
      toast.success(`${created.name} is ready.`);
    } catch (error) {
      console.error('Unable to create track', error);
      toast.error('Unable to create that track. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDaySelect = async (date) => {
    setSelectedDate(date);
    setHistoryTrack(null);
    try {
      await loadDayLogs(date);
    } catch (error) {
      console.error('Unable to load logs for date', error);
      toast.error('Unable to load that day.');
    }
  };

  const streak = calculateCurrentStreak(heatmap);
  const loggedDays = countLoggedDays(heatmap);
  const bestWeek = getBestWeekLoggedDays(heatmap);
  const longest = calculateLongestStreak(heatmap);
  const isToday = selectedDate === todayKey;
  const journalLogs = historyTrack ? (logsByTrack[historyTrack.id] || []) : dayLogs;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 dark:bg-black sm:p-6">
      <SEO
        title="Preparation log"
        description="Daily placement prep log with a yearly heatmap."
        canonical="/progress"
        noindex
      />

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Preparation log
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
              A year of placement prep, not just applications.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>New track</Button>
            <Button variant="primary" onClick={() => openLog()} disabled={activeTracks.length === 0}>
              Log today
            </Button>
          </div>
        </div>

        {activeTracks.length === 0 ? (
          <Card className="px-6 py-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Start a prep track</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
              DSA, development, system design, mocks, or reading. One log a day is enough to see whether prep is actually happening.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {TRACK_TEMPLATES.filter((template) => template.type !== 'custom').slice(0, 3).map((template) => (
                <Button
                  key={template.type}
                  variant="secondary"
                  onClick={() => handleCreateTrack({ name: template.defaultName, templateType: template.type })}
                >
                  {template.label}
                </Button>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="primary" onClick={() => setCreateOpen(true)}>Create a track</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] sm:gap-5">
            <div className="space-y-4">
              <Card className="overflow-hidden p-0">
                <div className="flex flex-wrap items-end justify-between gap-6 border-b border-gray-200 px-5 py-5 dark:border-white/[0.07] sm:px-6">
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-[2.15rem]">
                      {loggedDays}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">prep days in the last year</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Streak</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{streak} {streak === 1 ? 'day' : 'days'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Best week</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{bestWeek} of 7 days</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Longest</p>
                      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{longest} {longest === 1 ? 'day' : 'days'}</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-5 sm:px-6">
                  <HeatmapGrid
                    data={heatmap}
                    selectedDate={selectedDate}
                    today={new Date()}
                    onDaySelect={handleDaySelect}
                  />
                </div>
              </Card>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    streak={calculateTrackStreak(logsByTrack[track.id] || [])}
                    lastLogged={lastLoggedDate(logsByTrack[track.id] || [])}
                    onLogToday={() => openLog(track, todayKey)}
                    onOpenHistory={() => setHistoryTrack(track)}
                  />
                ))}
              </div>
            </div>

            <Card className="h-fit p-5 sm:p-6 xl:sticky xl:top-24">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
                {historyTrack ? historyTrack.name : (isToday ? 'Today' : 'Journal')}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                {historyTrack ? 'Track history' : (formatDate(selectedDate) || selectedDate)}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {historyTrack
                  ? `${(logsByTrack[historyTrack.id] || []).filter((log) => log.didLog).length} logged days`
                  : `${weekdayLabel(selectedDate)}${dayLogs.length > 0 ? ` · ${dayLogs.length} ${dayLogs.length === 1 ? 'log' : 'logs'}` : ' · no logs'}`}
              </p>
              <div className="mt-5">
                <LogHistory
                  logs={journalLogs}
                  emptyLabel={historyTrack ? 'No logs on this track yet.' : 'No prep logged.'}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {historyTrack ? (
                  <Button variant="secondary" onClick={() => setHistoryTrack(null)}>Back to day</Button>
                ) : (
                  <Button variant="primary" onClick={() => openLog(null, selectedDate)}>
                    {isToday ? 'Log today' : 'Add log'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <LogModal
        isOpen={logOpen}
        onClose={() => setLogOpen(false)}
        track={activeTrack}
        tracks={activeTracks}
        date={selectedDate}
        existingLog={existingLog}
        onSave={handleSaveLog}
        saving={saving}
      />
      <CreateTrackModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreateTrack}
        saving={saving}
      />
    </div>
  );
};

export default Progress;
