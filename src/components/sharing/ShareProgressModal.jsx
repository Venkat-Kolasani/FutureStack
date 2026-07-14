import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBriefcase, FaCheck, FaCopy, FaLock, FaShareAlt } from 'react-icons/fa';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { shareLinkService } from '../../services/api';

const FIELD_OPTIONS = [
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'applicationLink', label: 'Application link' },
  { key: 'rounds', label: 'Interview rounds' },
  { key: 'dateApplied', label: 'Date applied' },
];

const EXPIRY_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: 'permanent', label: 'No expiry' },
];

const SectionTitle = ({ children }) => (
  <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{children}</h4>
);

const SectionHint = ({ children }) => (
  <p className="mb-3 text-xs text-gray-500">{children}</p>
);

const ShareProgressModal = ({
  isOpen,
  onClose,
  opportunities,
  onShareCreated,
  preselectedOpportunity = null,
}) => {
  const isSingleShare = Boolean(preselectedOpportunity?.id);
  const [selectionMode, setSelectionMode] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [fields, setFields] = useState({
    status: true,
    description: true,
    deadline: true,
    applicationLink: true,
    rounds: true,
    dateApplied: true,
  });
  const [expiry, setExpiry] = useState('7d');
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [generatedShare, setGeneratedShare] = useState(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareableOpportunities = useMemo(
    () => opportunities.filter((opportunity) => ['internship', 'hackathon'].includes(opportunity.category)),
    [opportunities]
  );

  useEffect(() => {
    if (!isOpen) return;

    setGeneratedShare(null);
    setCopied(false);
    setPasscode('');
    setPasscodeEnabled(false);
    setExpiry('7d');
    setFields({
      status: true,
      description: true,
      deadline: true,
      applicationLink: true,
      rounds: true,
      dateApplied: true,
    });

    if (isSingleShare) {
      setSelectionMode('specific');
      setSelectedIds([preselectedOpportunity.id]);
      return;
    }

    setSelectionMode('all');
    setSelectedIds([]);
  }, [isOpen, isSingleShare, preselectedOpportunity?.id]);

  const selectedCount = isSingleShare
    ? 1
    : selectionMode === 'all'
      ? shareableOpportunities.length
      : selectionMode === 'internships'
        ? shareableOpportunities.filter((o) => o.category === 'internship').length
        : selectionMode === 'hackathons'
          ? shareableOpportunities.filter((o) => o.category === 'hackathon').length
          : selectedIds.length;

  const canGenerate = selectedCount > 0 && (!passcodeEnabled || /^\d{4}$/.test(passcode));

  const resetAndClose = () => {
    setGeneratedShare(null);
    setCopied(false);
    onClose();
  };

  const toggleOpportunity = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  };

  const handleCreateShare = async () => {
    if (!canGenerate) {
      toast.error('Select at least one opportunity and use a 4-digit passcode if enabled.');
      return;
    }

    try {
      setCreating(true);
      const share = await shareLinkService.create({
        opportunityIds: isSingleShare
          ? [preselectedOpportunity.id]
          : selectionMode === 'specific'
            ? selectedIds
            : selectionMode === 'internships'
              ? shareableOpportunities.filter((o) => o.category === 'internship').map((o) => o.id)
              : selectionMode === 'hackathons'
                ? shareableOpportunities.filter((o) => o.category === 'hackathon').map((o) => o.id)
                : undefined,
        fields,
        expiry,
        passcode: passcodeEnabled ? passcode : undefined,
      });
      setGeneratedShare(share);
      onShareCreated?.(share);
      toast.success('Share link created');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedShare?.url) return;

    try {
      await navigator.clipboard.writeText(generatedShare.url);
      setCopied(true);
      toast.success('Link copied to clipboard');
    } catch (error) {
      console.error('Error copying share link:', error);
      toast.error('Copy failed. Select the link and copy manually.');
    }
  };

  const modalTitle = isSingleShare ? 'Share internship' : 'Share progress';

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={modalTitle}
      className="max-w-2xl"
    >
      {generatedShare ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 text-green-300">
              <FaCheck size={14} />
              <p className="text-sm font-medium">Share link created</p>
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Anyone with this link can view a read-only snapshot. You can copy it again from Shared Links.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={generatedShare.url}
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs text-gray-200"
                aria-label="Generated share link"
              />
              <Button onClick={handleCopy} variant="success" className="shrink-0">
                <FaCopy className="mr-1.5" size={12} />
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
          <div className="flex justify-end border-t border-gray-200 dark:border-white/10 pt-4">
            <Button onClick={resetAndClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {isSingleShare && (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                <FaBriefcase size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Sharing</p>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{preselectedOpportunity.title}</p>
              </div>
            </div>
          )}

          {!isSingleShare && (
            <section>
              <SectionTitle>Scope</SectionTitle>
              <SectionHint>Choose which opportunities are included in this link.</SectionHint>
              <div className="inline-flex flex-wrap w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white/[0.03] p-1 gap-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectionMode('all')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors sm:flex-none ${
                    selectionMode === 'all'
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-gray-600 dark:text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  All ({shareableOpportunities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('internships')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors sm:flex-none ${
                    selectionMode === 'internships'
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-gray-600 dark:text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Internships ({shareableOpportunities.filter((o) => o.category === 'internship').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('hackathons')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors sm:flex-none ${
                    selectionMode === 'hackathons'
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-gray-600 dark:text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Hackathons ({shareableOpportunities.filter((o) => o.category === 'hackathon').length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('specific')}
                  className={`flex-1 rounded-md px-3 py-2 text-sm transition-colors sm:flex-none ${
                    selectionMode === 'specific'
                      ? 'bg-blue-500/15 text-blue-200'
                      : 'text-gray-600 dark:text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Selected ({selectedIds.length})
                </button>
              </div>
              {selectionMode === 'specific' && (
                <div className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 p-2">
                  {shareableOpportunities.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-gray-500">Add an opportunity first.</p>
                  ) : (
                    shareableOpportunities.map((opportunity) => (
                      <label
                        key={opportunity.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 hover:bg-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(opportunity.id)}
                          onChange={() => toggleOpportunity(opportunity.id)}
                          className="h-3.5 w-3.5 accent-blue-500"
                        />
                        <span className="truncate text-sm text-gray-200">{opportunity.title}</span>
                        <span className="ml-auto shrink-0 text-xs text-gray-500">{opportunity.category}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          <section className="border-t border-gray-200 dark:border-white/10 pt-5">
            <SectionTitle>Visible fields</SectionTitle>
            <SectionHint>Notes, documents, and interview prep are never shared.</SectionHint>
            <div className="rounded-lg border border-gray-200 dark:border-white/10 divide-y divide-white/8">
              {FIELD_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center justify-between px-3 py-2.5 hover:bg-white/[0.02]"
                >
                  <span className="text-sm text-gray-200">{option.label}</span>
                  <input
                    type="checkbox"
                    checked={fields[option.key]}
                    onChange={(event) =>
                      setFields((current) => ({ ...current, [option.key]: event.target.checked }))
                    }
                    className="h-3.5 w-3.5 accent-blue-500"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="border-t border-gray-200 dark:border-white/10 pt-5">
            <SectionTitle>Access</SectionTitle>
            <SectionHint>Set when the link expires and whether a passcode is required.</SectionHint>
            <div className="flex flex-wrap gap-2">
              {EXPIRY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setExpiry(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    expiry === option.value
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                      : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-white/20 hover:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border border-gray-200 dark:border-white/10 px-3 py-2.5 hover:bg-white/[0.02]">
              <input
                type="checkbox"
                checked={passcodeEnabled}
                onChange={(event) => setPasscodeEnabled(event.target.checked)}
                className="h-3.5 w-3.5 accent-blue-500"
              />
              <FaLock className="text-gray-500" size={12} />
              <span className="text-sm text-gray-200">Require 4-digit passcode</span>
            </label>
            {passcodeEnabled && (
              <input
                inputMode="numeric"
                maxLength={4}
                value={passcode}
                onChange={(event) => setPasscode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4 digits"
                className="mt-2 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-600 sm:w-40"
                aria-label="Share link passcode"
              />
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 dark:border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {selectedCount} opportunit{selectedCount === 1 ? 'y' : 'ies'} · read-only snapshot
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button onClick={handleCreateShare} disabled={!canGenerate || creating}>
                <FaShareAlt className="mr-2" size={12} />
                {creating ? 'Creating...' : 'Create link'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default ShareProgressModal;
