import Card from '../common/Card';
import Button from '../common/Button';
import { getTrackTemplate } from '../../utils/progressTemplates';
import { formatDate } from '../../utils/dateHelpers';

const TrackCard = ({
  track,
  streak = 0,
  lastLogged = null,
  onLogToday,
  onOpenHistory,
}) => {
  const template = getTrackTemplate(track.templateType);

  return (
    <Card className="flex h-full flex-col p-5">
      <button type="button" onClick={onOpenHistory} className="text-left">
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${template.accent}`} aria-hidden="true" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">
            {template.shortLabel}
          </span>
        </span>
        <h3 className="mt-3 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
          {track.name}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {lastLogged ? `Last logged ${formatDate(lastLogged)}` : 'No logs yet'}
        </p>
      </button>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-400 dark:text-gray-500">Streak</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
        <Button variant="primary" className="px-4 py-2 text-sm" onClick={onLogToday}>
          Log today
        </Button>
      </div>
    </Card>
  );
};

export default TrackCard;
