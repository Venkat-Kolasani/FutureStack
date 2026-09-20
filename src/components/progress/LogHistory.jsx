import { formatDate } from '../../utils/dateHelpers';
import { getTrackTemplate } from '../../utils/progressTemplates';

const metadataSummary = (log) => {
  const template = getTrackTemplate(log.templateType);
  if (!log.metadata) return [];
  return template.fields
    .map((field) => {
      const value = log.metadata[field.key];
      if (value === undefined || value === null || value === '') return null;
      return `${field.label}: ${value}`;
    })
    .filter(Boolean);
};

const LogHistory = ({ logs = [], emptyLabel = 'No prep logged.' }) => {
  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-white/10">
        <p className="text-sm text-gray-600 dark:text-gray-300">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {logs.map((log) => {
        const extras = metadataSummary(log);
        const template = getTrackTemplate(log.templateType);
        return (
          <li key={log.id} className="flex gap-3">
            <span className={`mt-1.5 h-8 w-0.5 shrink-0 rounded-full ${template.accent}`} aria-hidden="true" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                {log.trackName || template.label}
                {log.logDate ? ` · ${formatDate(log.logDate)}` : ''}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                {log.didLog ? (log.whatDidYouDo || 'Logged prep.') : 'Off day — kept the grid honest.'}
              </p>
              {log.didLog && log.whatDidYouLearn && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{log.whatDidYouLearn}</p>
              )}
              {extras.length > 0 && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{extras.join(' · ')}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default LogHistory;
