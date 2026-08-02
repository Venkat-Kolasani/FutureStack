import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { roundService } from '../services/api';
import { getRoundTypeLabel } from '../utils/roundHelpers';

const REMINDER_PREF_KEY = 'futurestack_interview_reminders';
const REMINDER_HOUR = 9;

function toDateKey(dateStr) {
  return dateStr;
}

function getReminderFireTime(scheduledDate, kind) {
  const base = new Date(`${scheduledDate}T00:00:00`);
  if (kind === 'day_before') {
    base.setDate(base.getDate() - 1);
  }
  base.setHours(REMINDER_HOUR, 0, 0, 0);
  return base.getTime();
}

function scheduleNotification({ id, title, body, fireAt }) {
  const delay = fireAt - Date.now();
  if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) {
    return null;
  }

  const sessionKey = `reminder:${id}`;
  if (sessionStorage.getItem(sessionKey)) {
    return null;
  }

  return setTimeout(() => {
    sessionStorage.setItem(sessionKey, '1');

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, tag: id });
    } else {
      toast.info(body, { autoClose: 8000 });
    }
  }, delay);
}

/**
 * Client-side interview reminders for pending rounds with scheduled dates.
 */
export function useInterviewReminders() {
  const { isSignedIn } = useUser();
  const timersRef = useRef([]);

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

        const pref = localStorage.getItem(REMINDER_PREF_KEY);
        if (pref !== 'off' && typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission().then((result) => {
          .catch(err => console.error(err))