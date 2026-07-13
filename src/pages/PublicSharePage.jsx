import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaBriefcase,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaLock,
  FaRocket,
  FaShieldAlt,
  FaUserGraduate,
} from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import RoundTimelineReadOnly from '../components/rounds/RoundTimelineReadOnly';
import { shareLinkService } from '../services/api';
import { formatDate, getDaysRemaining } from '../utils/dateHelpers';
import { getCampusModeLabel, CAMPUS_MODE_BADGE_STYLES } from '../utils/opportunityHelpers';

const STATUS_STYLES = {
  applied: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
  interviewed: 'bg-purple-500/10 text-purple-200 border-purple-500/20',
  shortlisted: 'bg-amber-500/10 text-amber-200 border-amber-500/20',
  selected: 'bg-green-500/10 text-green-200 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
  ghosted: 'bg-slate-500/10 text-slate-200 border-slate-500/20',
};

const statusLabel = (status) => {
  if (!status) return 'Hidden';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const formatSharedTimestamp = (value) => {
  if (!value) return 'Not shown';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDate(value);
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDeadlineState = (deadline) => {
  if (!deadline) return { label: 'No deadline shared', className: 'text-gray-600 dark:text-gray-400' };

  const diffDays = getDaysRemaining(deadline);

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`, className: 'text-red-300' };
  }

  if (diffDays === 0) {
    return { label: 'Due today', className: 'text-amber-300' };
  }

  if (diffDays <= 7) {
    return { label: `${diffDays} day${diffDays === 1 ? '' : 's'} left`, className: 'text-amber-300' };
  }

  return { label: `${diffDays} days left`, className: 'text-green-300' };
};

const PublicSharePage = () => {
  const { token } = useParams();
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passcodeError, setPasscodeError] = useState('');

  const fetchPublicShare = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shareLinkService.getPublic(token);
      setShare(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 410) {
        setError('This link has expired or been revoked.');
      } else {
        setError('We could not load this shared dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPublicShare();
  }, [fetchPublicShare]);

  const verifyPasscode = async (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(passcode)) {
      setPasscodeError('Enter the 4-digit passcode.');
      return;
    }

    try {
      setPasscodeLoading(true);
      setPasscodeError('');
      const data = await shareLinkService.verifyPasscode(token, passcode);
      setShare(data);
    } catch (err) {
      setPasscodeError(err?.response?.data?.message || 'Incorrect passcode. Please try again.');
    } finally {
      setPasscodeLoading(false);
    }
  };

  const snapshot = share?.snapshot;
  const opportunities = snapshot?.opportunities || [];
  const summary = useMemo(() => snapshot?.summary || {}, [snapshot]);
  const fields = snapshot?.options?.fields || {};

  const heroStats = useMemo(
    () => [
      { label: 'Opportunities', value: summary.total || 0, accent: 'text-blue-200' },
      { label: 'Apply links', value: summary.opportunitiesWithLinks || 0, accent: 'text-purple-200' },
      { label: 'Upcoming deadlines', value: summary.upcomingDeadlineCount || 0, accent: 'text-amber-200' },
      { label: 'Selected', value: summary.selected || 0, accent: 'text-green-200' },
    ],
    [summary]
  );

  const renderUnavailable = (message) => (
    <div className="min-h-screen bg-white dark:bg-black px-4 py-12 text-gray-900 dark:text-white">
      <SEO
        title="Shared Dashboard Unavailable"
        description="This FutureStack shared dashboard link is unavailable."
        canonical={`/share/${token}`}
        noindex={true}
      />
      <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300">
            <FaLock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared dashboard unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{message}</p>
          <Link to="/" className="mt-6 inline-flex">
            <Button>
              Visit FutureStack
              <FaExternalLinkAlt className="ml-2 text-sm" />
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white">
        <SEO
          title="Loading Shared Dashboard"
          description="Loading shared FutureStack opportunities."
          canonical={`/share/${token}`}
          noindex={true}
        />
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading shared opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return renderUnavailable(error);
  }

  if (share?.requiresPasscode) {
    return (
      <div className="min-h-screen bg-white dark:bg-black px-4 py-12 text-gray-900 dark:text-white">
        <SEO
          title="Passcode Required"
          description="Enter the passcode to view these shared FutureStack opportunities."
          canonical={`/share/${token}`}
          noindex={true}
        />
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <Card className="w-full p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/15 text-blue-200">
              <FaLock size={24} />
            </div>
            <h1 className="text-center text-2xl font-bold text-gray-900 dark:text-white">Passcode required</h1>
            <p className="mt-3 text-center text-gray-700 dark:text-gray-300">
              These shared opportunities are protected. Enter the 4-digit passcode from the sender.
            </p>
            <form onSubmit={verifyPasscode} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">4-digit passcode</span>
                <input
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value.replace(/\D/g, '').slice(0, 4));
                    setPasscodeError('');
                  }}
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 px-4 py-3 text-center text-2xl tracking-[0.5em] text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  aria-label="Share passcode"
                />
              </label>
              {passcodeError && <p className="text-sm text-red-300">{passcodeError}</p>}
              <Button type="submit" disabled={passcodeLoading} className="w-full">
                {passcodeLoading ? 'Verifying...' : 'Unlock Dashboard'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return renderUnavailable('This share link did not include a readable dashboard snapshot.');
  }

  return (
    <div className="min-h-screen overflow-hidden bg-white dark:bg-black text-gray-900 dark:text-white">
      <SEO
        title="Shared Opportunities"
        description="Read-only FutureStack opportunities with deadlines and application links."
        canonical={`/share/${token}`}
        noindex={true}
      />

      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-20 right-0 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-10 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-200">
                <FaShieldAlt />
                Read-only opportunity share
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                Shared opportunities you can act on.
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-700 dark:text-gray-300 sm:text-lg">
                Review the opportunity details, deadlines, progress, and application links shared from FutureStack.
                Private notes, documents, prep work, and owner identity stay hidden.
              </p>
            </div>
            <Link to="/" className="inline-flex">
              <Button className="w-full sm:w-auto">
                Try FutureStack
                <FaRocket className="ml-2" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/30 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className={`mt-2 text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                <FaBriefcase className="text-blue-300" />
                Shared opportunities
              </h2>
              <span className="text-sm text-gray-500">Generated {formatSharedTimestamp(snapshot.generatedAt)}</span>
            </div>

            {opportunities.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">No opportunities were included in this shared snapshot.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {opportunities.map((opportunity) => (
                  <Card key={opportunity.id} className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/30 hover:bg-white/[0.02] hover:shadow-xl hover:shadow-blue-900/10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                          {opportunity.category || 'internship'}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{opportunity.title}</h3>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2">
                        <div className="flex items-center gap-2">
                          {opportunity.campus_mode && getCampusModeLabel(opportunity.campus_mode) && (
                            <span className={`w-fit rounded-full px-3 py-1 text-sm ${CAMPUS_MODE_BADGE_STYLES[opportunity.campus_mode] || 'border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-700 dark:text-gray-300'}`}>
                              {getCampusModeLabel(opportunity.campus_mode)}
                            </span>
                          )}
                          {fields.status && (
                            <span className={`w-fit rounded-full border px-3 py-1 text-sm ${STATUS_STYLES[opportunity.status] || 'border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-200'}`}>
                              {statusLabel(opportunity.status)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {fields.description && opportunity.description && (
                      <p className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                        {opportunity.description}
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {fields.deadline && (
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <FaCalendarAlt />
                            Deadline
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(opportunity.deadline)}</p>
                          <p className={`mt-1 text-xs ${getDeadlineState(opportunity.deadline).className}`}>
                            {getDeadlineState(opportunity.deadline).label}
                          </p>
                        </div>
                      )}
                      {fields.rejectedRound && (
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">Pipeline stage</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            {opportunity.rejectedRoundNumber
                              ? `Rejected at round ${opportunity.rejectedRoundNumber}`
                              : opportunity.currentRoundNumber
                                ? `Currently at round ${opportunity.currentRoundNumber}`
                                : 'Not recorded'}
                          </p>
                        </div>
                      )}
                      {fields.dateApplied && (
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-gray-500">Date applied</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatSharedTimestamp(opportunity.dateApplied)}</p>
                        </div>
                      )}
                    </div>

                    {fields.rounds && opportunity.interviewRounds?.length > 0 && (
                      <RoundTimelineReadOnly rounds={opportunity.interviewRounds} />
                    )}

                    {fields.applicationLink && opportunity.applicationLink && (
                      <div className="mt-5">
                        <a
                          href={opportunity.applicationLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 px-5 py-3 font-semibold text-blue-200 transition-colors hover:bg-blue-500 hover:text-white sm:w-auto"
                        >
                          Apply / Open opportunity
                          <FaExternalLinkAlt className="ml-2 text-xs" />
                        </a>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <section className="mt-16">
            <Card className="relative overflow-hidden border-gray-200 dark:border-white/10 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/5 p-[1px]">
              <div className="relative flex flex-col items-center justify-between gap-6 rounded-2xl bg-white dark:bg-black/40 p-8 text-center backdrop-blur-md sm:flex-row sm:p-10 sm:text-left">
                <div className="flex items-start gap-5">
                  <div className="hidden rounded-2xl bg-blue-500/20 p-4 text-blue-300 ring-1 ring-white/10 sm:flex">
                    <FaUserGraduate size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Build your own tracker</h2>
                    <p className="mt-2 max-w-xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
                      FutureStack helps students organize applications, interview rounds, prep work,
                      documents, hackathons, analytics, and reports in one focused, premium workspace.
                    </p>
                  </div>
                </div>
                <Link to="/" className="inline-flex shrink-0">
                  <Button className="px-6 py-3 text-base font-semibold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40">
                    Explore FutureStack
                    <FaExternalLinkAlt className="ml-2 text-sm" />
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </section>
      </main>

      <footer className="relative border-t border-gray-200 dark:border-white/10 px-4 py-8 text-center text-sm text-gray-500">
        Shared via FutureTracker — futuretracker.online
      </footer>
    </div>
  );
};

export default PublicSharePage;
