export const STATUS_PAGE_URL = 'https://stats.uptimerobot.com/ArICmEg95Y';

const StatusIndicator = ({ className = '' }) => (
  <a
    href={STATUS_PAGE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-200 transition-colors ${className}`}
    aria-label="View system status on UptimeRobot"
  >
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
    <span>Status</span>
  </a>
);

export default StatusIndicator;
