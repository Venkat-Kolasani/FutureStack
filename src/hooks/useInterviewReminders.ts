import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-toastify';
import { roundService } from '../services/api';
import { getRoundTypeLabel } from '../utils/roundHelpers';

const REMINDER_PREF_KEY = 'futurestack_interview_reminders';
const REMINDER_HOUR = 9;

function toDateKey(dateStr: string) {
  return dateStr;
}

function getReminderFireTime(scheduledDate: string, kind: 'day_before' | 'morning') {
  const base = new Date(`${scheduledDate}T00:00:00`);
  if (kind === 'day_before') {
    base.setDate(base.getDate() - 1);
  }
  base.setHours(REMINDER_HOUR, 0, 0, 0);
  return base.getTime();
}

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Continue without persistence or deduplication.
  }
}

function scheduleNotification({
  id,
  title,
  body,
  fireAt,
}: {
  id: string;
  title: string;
  body: string;
  fireAt: number;
}) {
  const delay = fireAt - Date.now();
  if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  const sessionKey = `reminder:${id}`;
  if (readStorage(sessionStorage, sessionKey)) {
    return null;
  }

  return setTimeout(() => {
    writeStorage(sessionStorage, sessionKey, '1');

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: id });
    } else {
      toast.info(body, { autoClose: 8000 });
    }
  }, delay);
}

export function useInterviewReminders() {
  const { isSignedIn } = useUser();
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const today = new Date();
        const from = new Date(today);
        from.setDate(from.getDate() - 1);
        const to = new Date(today);
        to.setDate(to.getDate() + 7);

        const fromStr = from.toISOString().slice(0, 10);
        const toStr = to.toISOString().slice(0, 10);

        const rounds = await roundService.listUpcoming({ from: fromStr, to: toStr });
        if (cancelled) return;

        const pref = readStorage(localStorage, REMINDER_PREF_KEY);
        if (pref !== 'off' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission().then((result) => {
            writeStorage(localStorage, REMINDER_PREF_KEY, result === 'denied' ? 'off' : 'on');
          });
        }

        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];

        for (const round of rounds) {
          const typeLabel = getRoundTypeLabel(round.roundType);
          const baseBody = `${round.opportunityTitle} — Round ${round.roundNumber} (${typeLabel})`;

          const dayBeforeTimer = scheduleNotification({
            id: `${round.id}:day_before`,
            title: 'Interview tomorrow',
            body: baseBody,
            fireAt: getReminderFireTime(toDateKey(round.scheduledDate), 'day_before'),
          });

          const morningTimer = scheduleNotification({
            id: `${round.id}:morning`,
            title: 'Interview today',
            body: baseBody,
            fireAt: getReminderFireTime(toDateKey(round.scheduledDate), 'morning'),
          });

          if (dayBeforeTimer) timersRef.current.push(dayBeforeTimer);
          if (morningTimer) timersRef.current.push(morningTimer);
        }
      } catch (error) {
        console.error('Interview reminders setup failed:', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [isSignedIn]);
}
