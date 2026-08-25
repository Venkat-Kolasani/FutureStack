import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { TRACK_TEMPLATES } from '../../utils/progressTemplates';

const FIELD_CLASS = 'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-gray-500';

const CreateTrackModal = ({ isOpen, onClose, onSave, saving = false }) => {
  const [templateType, setTemplateType] = useState('leetcode');
  const [name, setName] = useState('DSA');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const template = TRACK_TEMPLATES.find((item) => item.type === 'leetcode');
    setTemplateType(template.type);
    setName(template.defaultName);
    setError('');
  }, [isOpen]);

  const handleTemplate = (type) => {
    const template = TRACK_TEMPLATES.find((item) => item.type === type);
    setTemplateType(type);
    setName((current) => {
      const previous = TRACK_TEMPLATES.find((item) => item.type === templateType);
      if (!current.trim() || current === previous?.defaultName) {
        return template.defaultName;
      }
      return current;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Give the track a name you will still recognize in a month.');
      return;
    }
    setError('');
    await onSave({ name: name.trim(), templateType });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New track" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Template</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TRACK_TEMPLATES.map((template) => {
              const selected = template.type === templateType;
              return (
                <button
                  key={template.type}
                  type="button"
                  onClick={() => handleTemplate(template.type)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selected
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
                      : 'border-gray-200 hover:border-gray-300 dark:border-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${template.accent}`} aria-hidden="true" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{template.label}</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{template.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track name</span>
          <input
            className={FIELD_CLASS}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="DSA"
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create track'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTrackModal;
