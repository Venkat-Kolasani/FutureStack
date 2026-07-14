import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { ButtonSpinner } from '../common/LoadingSpinner';
import {
  ROUND_RESULTS,
  ROUND_TYPES,
  ROUND_RESULT_LABELS,
  ROUND_TYPE_LABELS,
  ROUND_RESULT_HINTS,
  NOTES_MAX_LENGTH,
} from '../../utils/roundHelpers';

const emptyForm = {
  round_type: 'oa',
  scheduled_date: '',
  result: 'pending',
  notes: '',
};

const RESULT_BUTTON_STYLES = {
  pending: 'border-blue-500/40 bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
  cleared: 'border-green-500/40 bg-green-500/15 text-green-300 ring-1 ring-green-500/30',
  rejected: 'border-red-500/40 bg-red-500/15 text-red-300 ring-1 ring-red-500/30',
  skipped: 'border-gray-500/40 bg-gray-500/15 text-gray-700 dark:text-gray-300 ring-1 ring-gray-500/30',
};

const RESULT_IDLE_STYLES =
  'border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-gray-300';

/**
 * Create or edit an interview round.
 */
const AddRoundModal = ({
  isOpen,
  onClose,
  onSubmit,
  roundNumber,
  initialRound = null,
  saving = false,
}) => {
  const [form, setForm] = useState(emptyForm);
  const isEdit = Boolean(initialRound);

  useEffect(() => {
    if (!isOpen) return;

    if (initialRound) {
      setForm({
        round_type: initialRound.round_type || 'oa',
        scheduled_date: initialRound.scheduled_date || '',
        result: initialRound.result || 'pending',
        notes: initialRound.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, initialRound]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleResultSelect = (result) => {
    if (saving) return;
    setForm((prev) => ({ ...prev, result }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      round_type: form.round_type,
      result: form.result,
      notes: form.notes.trim() || null,
      scheduled_date: form.scheduled_date || null,
    };
    await onSubmit(payload);
  };

  const title = isEdit
    ? `Edit Round ${initialRound.round_number}`
    : `Add Round ${roundNumber}`;

  const notesLength = form.notes.length;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-600 dark:text-gray-400 -mt-1">
          {isEdit
            ? 'Update details or mark the outcome when you hear back.'
            : 'Log the next step in your hiring pipeline.'}
        </p>

        <div>
          <label htmlFor="round_type" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Round type
          </label>
          <select
            id="round_type"
            value={form.round_type}
            onChange={handleChange('round_type')}
            disabled={saving}
            className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-60"
            required
          >
            {ROUND_TYPES.map((type) => (
              <option key={type} value={type} style={{ backgroundColor: '#111827' }}>
                {ROUND_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="scheduled_date" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Scheduled date
            <span className="ml-1 font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="scheduled_date"
            type="date"
            value={form.scheduled_date}
            onChange={handleChange('scheduled_date')}
            disabled={saving}
            className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-60 [color-scheme:dark]"
          />
        </div>

        <fieldset disabled={saving}>
          <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Result</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROUND_RESULTS.map((result) => (
              <button
                key={result}
                type="button"
                onClick={() => handleResultSelect(result)}
                className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-all ${
                  form.result === result ? RESULT_BUTTON_STYLES[result] : RESULT_IDLE_STYLES
                }`}
                aria-pressed={form.result === result}
              >
                {ROUND_RESULT_LABELS[result]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">{ROUND_RESULT_HINTS[form.result]}</p>
        </fieldset>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
              <span className="ml-1 font-normal text-gray-500">(optional)</span>
            </label>
            <span className={`text-xs ${notesLength > NOTES_MAX_LENGTH ? 'text-red-400' : 'text-gray-500'}`}>
              {notesLength}/{NOTES_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="notes"
            value={form.notes}
            onChange={handleChange('notes')}
            maxLength={NOTES_MAX_LENGTH}
            rows={3}
            disabled={saving}
            className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2.5 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none disabled:opacity-60"
            placeholder="Prep topics, interviewer names, feedback..."
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || notesLength > NOTES_MAX_LENGTH}>
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <ButtonSpinner />
                Saving…
              </span>
            ) : isEdit ? (
              'Save changes'
            ) : (
              'Add round'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddRoundModal;
