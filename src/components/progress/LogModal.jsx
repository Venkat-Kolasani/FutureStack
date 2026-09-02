import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { emptyMetadata, getTrackTemplate, MOOD_OPTIONS } from '../../utils/progressTemplates';
import { formatLocalDate } from '../../utils/heatmapHelpers';

const FIELD_CLASS = 'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-gray-500';

const LogModal = ({
  isOpen,
  onClose,
  track,
  tracks = [],
  date,
  existingLog = null,
  onSave,
  saving = false,
}) => {
  const selectableTracks = tracks.length > 0 ? tracks : (track ? [track] : []);
  const [trackId, setTrackId] = useState(track?.id || selectableTracks[0]?.id || '');
  const selectedTrack = selectableTracks.find((item) => item.id === trackId) || track || selectableTracks[0];
  const template = getTrackTemplate(selectedTrack?.templateType);

  const [logDate, setLogDate] = useState(date || formatLocalDate(new Date()));
  const [didLog, setDidLog] = useState(true);
  const [whatDidYouDo, setWhatDidYouDo] = useState('');
  const [whatDidYouLearn, setWhatDidYouLearn] = useState('');
  const [mood, setMood] = useState('');
  const [metadata, setMetadata] = useState(emptyMetadata(selectedTrack?.templateType));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextTrackId = track?.id || selectableTracks[0]?.id || '';
    const nextTrack = selectableTracks.find((item) => item.id === nextTrackId) || track;
    setTrackId(nextTrackId);
    setLogDate(existingLog?.logDate || date || formatLocalDate(new Date()));
    setDidLog(existingLog ? existingLog.didLog : true);
    setWhatDidYouDo(existingLog?.whatDidYouDo || '');
    setWhatDidYouLearn(existingLog?.whatDidYouLearn || '');
    setMood(existingLog?.mood || '');
    setMetadata({
      ...emptyMetadata(nextTrack?.templateType),
      ...(existingLog?.metadata || {}),
    });
    setError('');
  }, [isOpen, track, date, existingLog]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = useMemo(() => {
    if (!selectedTrack) return 'Log prep';
    return existingLog ? `Edit ${selectedTrack.name}` : `Log ${selectedTrack.name}`;
  }, [existingLog, selectedTrack]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTrack) {
      setError('Choose a track first.');
      return;
    }
    if (didLog && !whatDidYouDo.trim()) {
      setError('Write what you actually did. One sentence is enough.');
      return;
    }

    setError('');
    await onSave({
      trackId: selectedTrack.id,
      logDate,
      didLog,
      whatDidYouDo: didLog ? whatDidYouDo.trim() : '',
      whatDidYouLearn: didLog ? whatDidYouLearn.trim() : '',
      metadata: didLog ? metadata : {},
      mood: didLog && mood ? mood : null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {selectableTracks.length > 1 && (
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track</span>
            <select
              className={FIELD_CLASS}
              value={trackId}
              onChange={(event) => {
                const nextId = event.target.value;
                const nextTrack = selectableTracks.find((item) => item.id === nextId);
                setTrackId(nextId);
                setMetadata(emptyMetadata(nextTrack?.templateType));
              }}
            >
              {selectableTracks.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={logDate}
              max={formatLocalDate(new Date())}
              onChange={(event) => setLogDate(event.target.value)}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Did you prep?</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { value: true, label: 'Yes' },
                { value: false, label: 'Off day' },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setDidLog(option.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    didLog === option.value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-white/10 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {didLog ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">What did you do?</span>
              <textarea
                className={`${FIELD_CLASS} min-h-[88px] resize-y`}
                value={whatDidYouDo}
                onChange={(event) => setWhatDidYouDo(event.target.value)}
                placeholder="3 graph problems, including a timed medium"
                required={didLog}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">What did you learn?</span>
              <textarea
                className={`${FIELD_CLASS} min-h-[72px] resize-y`}
                value={whatDidYouLearn}
                onChange={(event) => setWhatDidYouLearn(event.target.value)}
                placeholder="Visited-set belongs on the node, not the edge"
              />
            </label>

            {template.fields.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {template.fields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        className={FIELD_CLASS}
                        value={metadata[field.key] || ''}
                        onChange={(event) => setMetadata((current) => ({ ...current, [field.key]: event.target.value }))}
                      >
                        <option value="">Skip</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        min={field.min}
                        max={field.max}
                        className={FIELD_CLASS}
                        value={metadata[field.key] || ''}
                        placeholder={field.placeholder}
                        onChange={(event) => setMetadata((current) => ({ ...current, [field.key]: event.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">How did it feel?</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMood((current) => (current === option.value ? '' : option.value))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      mood === option.value
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-white/10 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">
            Off days stay empty on purpose. The heatmap should show real prep, not a checked box.
          </p>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save log'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default LogModal;
