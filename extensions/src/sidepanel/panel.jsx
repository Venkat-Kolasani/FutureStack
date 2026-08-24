import { useId, useState } from 'react';
import { useAuth } from '@clerk/chrome-extension';
import { MAX_DESCRIPTION, MAX_LINK, MAX_TITLE, describeLinkError, saveOpportunity } from '../lib/api.js';
import { SITE_LABELS, isWeakParse } from '../lib/extractJob.js';
import { useListing } from './useListing.js';
import './panel.css';

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'selected', label: 'Selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'ghosted', label: 'Ghosted' },
];

const CATEGORY_OPTIONS = [
  { value: 'internship', label: 'Internship' },
  { value: 'hackathon', label: 'Hackathon' },
];

const CAMPUS_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'on_campus', label: 'On-campus' },
  { value: 'off_campus', label: 'Off-campus' },
];

function BrandHeader({ subtitle, site }) {
  const siteLabel = SITE_LABELS[site] || SITE_LABELS.generic;

  return (
    <header className="panel-header">
      <div className="brand-row">
        <div className="brand-mark" aria-hidden="true">F</div>
        <div className="brand-copy">
          <h1 className="brand-title">FutureTracker</h1>
          {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
        </div>
        <span className="site-chip" title={`Detected site: ${siteLabel}`}>
          {siteLabel}
        </span>
      </div>
    </header>
  );
}

function SegmentedControl({ label, name, value, options, onChange }) {
  const groupId = useId();

  return (
    <fieldset className="field">
      <legend className="field-label" id={groupId}>
        {label}
      </legend>
      <div className="segmented" role="radiogroup" aria-labelledby={groupId}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={`${name}-${option.value || 'unset'}`}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`segment${selected ? ' is-active' : ''}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StatusMessage({ status, message }) {
  if (!message) return null;
  const className = status === 'saved' || status === 'hint'
    ? `status ${status === 'saved' ? 'status-success' : 'status-hint'}`
    : 'status status-error';
  const role = status === 'saved' || status === 'hint' ? 'status' : 'alert';

  return (
    <p className={className} role={role} aria-live="polite">
      {message}
    </p>
  );
}

function CharCount({ value, max }) {
  const length = String(value || '').length;
  const over = length > max;
  return (
    <span className={`char-count${over ? ' is-over' : ''}`}>
      {length}/{max}
    </span>
  );
}

function FieldActions({ fieldLabel, onUse, onAdd }) {
  return (
    <div className="field-actions">
      <button
        type="button"
        className="btn-quiet"
        onClick={onUse}
        aria-label={`Use page selection for ${fieldLabel}`}
      >
        Use selection
      </button>
      {onAdd ? (
        <button
          type="button"
          className="btn-quiet"
          onClick={onAdd}
          aria-label={`Add page selection to ${fieldLabel}`}
        >
          Add selection
        </button>
      ) : null}
    </div>
  );
}

export default function SidePanel() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const {
    data,
    metadataState,
    selectionMessage,
    updateField,
    applySelection,
    reread,
    forgetDraft,
  } = useListing();
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const titleErrorId = useId();
  const linkErrorId = useId();
  const statusMessageId = useId();
  const hintId = useId();
  const selectionId = useId();

  function handleField(name, value) {
    updateField(name, value);
    if (saveStatus !== 'idle' && saveStatus !== 'saving') {
      setSaveStatus('idle');
      setSaveError('');
    }
  }

  async function handleSave(event) {
    event.preventDefault();

    if (!data.title.trim()) {
      setSaveStatus('missing-title');
      setSaveError('Please enter a title.');
      document.getElementById('ft-title')?.focus();
      return;
    }

    const linkError = describeLinkError(data.link);
    if (linkError) {
      setSaveStatus('invalid-link');
      setSaveError(linkError);
      document.getElementById('ft-link')?.focus();
      return;
    }

    setSaveStatus('saving');
    setSaveError('');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const token = await getToken();
      if (!token) {
        setSaveStatus('auth-error');
        setSaveError('Session expired. Sign in again at futuretracker.online.');
        return;
      }

      await saveOpportunity(
        token,
        {
          title: data.title,
          description: data.description,
          link: data.link,
          category: data.category,
          status: data.status,
          campus_mode: data.campus_mode || null,
        },
        controller.signal,
      );

      setSaveStatus('saved');
      setSaveError('');
      await forgetDraft();
    } catch (error) {
      console.error('FutureTracker: save failed', error);
      if (error.name === 'AbortError') {
        setSaveStatus('timeout');
        setSaveError('Request timed out. Try again.');
      } else {
        setSaveError(error?.message || 'Failed to save. Try again.');
        setSaveStatus('error');
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!isLoaded) {
    return (
      <div className="panel">
        <BrandHeader subtitle="Checking session…" site={data.site} />
        <div className="panel-center" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="state-title">Loading</p>
          <p className="state-copy">Connecting to your FutureTracker account.</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="panel">
        <BrandHeader subtitle="Quick save from any job page" site={data.site} />
        <div className="panel-center">
          <p className="state-title">Sign in required</p>
          <p className="state-copy">
            Sign in once on the website, then close and reopen this panel to save the listing.
          </p>
          <a
            className="btn btn-primary"
            href="https://futuretracker.online/sign-in"
            target="_blank"
            rel="noreferrer"
          >
            Open FutureTracker
          </a>
        </div>
      </div>
    );
  }

  const dashboardPath = data.category === 'hackathon' ? '/hackathons' : '/internships';
  const weakParse = isWeakParse(data);
  const helperBits = [data.company, data.location].filter(Boolean);
  const subtitle = metadataState === 'loading'
    ? 'Reading page…'
    : metadataState === 'unread'
      ? 'Paste or select text from the page'
      : 'Save this opportunity';
  const parseHint = selectionMessage
    || (metadataState === 'loading'
      ? null
      : metadataState === 'unread'
        ? 'This page could not be read automatically. Copy sections from the listing, then paste here or use Add selection. The panel stays open while you do that.'
        : weakParse
          ? 'Review the title and description. Select another section on the page and click Add selection, or paste with Ctrl/Cmd+V.'
          : null);
  const parseHintStatus = selectionMessage === 'Added from the page selection.'
    ? 'saved'
    : selectionMessage
      ? 'error'
      : metadataState === 'unread' || weakParse
        ? 'hint'
        : 'saved';
  const statusMessage =
    saveStatus === 'saved'
      ? 'Saved. It’s on your FutureTracker board.'
      : saveStatus === 'missing-title' || saveStatus === 'invalid-link' || saveStatus === 'auth-error' || saveStatus === 'timeout' || saveStatus === 'error'
        ? saveError
        : '';

  return (
    <div className="panel">
      <BrandHeader subtitle={subtitle} site={data.site} />

      <main className="panel-main">
        <form id="ft-save-form" className="save-form" onSubmit={handleSave} noValidate>
          {helperBits.length ? (
            <p className="detected-meta" aria-live="polite">
              {helperBits.join(' · ')}
            </p>
          ) : null}

          <div className="field">
            <div className="field-head">
              <label className="field-label" htmlFor="ft-title">
                Title <span className="required" aria-hidden="true">*</span>
              </label>
              <CharCount value={data.title} max={MAX_TITLE} />
            </div>
            <FieldActions
              fieldLabel="title"
              onUse={() => applySelection('title', 'replace')}
            />
            <input
              id="ft-title"
              className="field-input"
              value={data.title}
              onChange={(event) => handleField('title', event.target.value)}
              placeholder="Role or opportunity title"
              required
              aria-required="true"
              aria-invalid={saveStatus === 'missing-title'}
              aria-describedby={saveStatus === 'missing-title' ? titleErrorId : undefined}
              autoComplete="off"
              maxLength={MAX_TITLE}
            />
            {saveStatus === 'missing-title' ? (
              <p id={titleErrorId} className="field-error">
                Title is required.
              </p>
            ) : null}
          </div>

          <div className="field">
            <div className="field-head">
              <label className="field-label" htmlFor="ft-description">
                Description <span className="optional">(optional)</span>
              </label>
              <CharCount value={data.description} max={MAX_DESCRIPTION} />
            </div>
            <FieldActions
              fieldLabel="description"
              onUse={() => applySelection('description', 'replace')}
              onAdd={() => applySelection('description', 'append')}
            />
            <textarea
              id="ft-description"
              className="field-textarea"
              value={data.description}
              onChange={(event) => handleField('description', event.target.value)}
              placeholder="Job description, notes, or pasted sections"
              maxLength={MAX_DESCRIPTION}
            />
          </div>

          <div className="field">
            <div className="field-head">
              <label className="field-label" htmlFor="ft-link">
                Page link
              </label>
              <CharCount value={data.link} max={MAX_LINK} />
            </div>
            <input
              id="ft-link"
              className="field-input"
              type="url"
              value={data.link}
              onChange={(event) => handleField('link', event.target.value)}
              placeholder="https://"
              autoComplete="off"
              aria-invalid={saveStatus === 'invalid-link'}
              aria-describedby={saveStatus === 'invalid-link' ? linkErrorId : undefined}
            />
            {saveStatus === 'invalid-link' ? (
              <p id={linkErrorId} className="field-error">
                {saveError}
              </p>
            ) : null}
          </div>

          <SegmentedControl
            label="Category"
            name="category"
            value={data.category}
            options={CATEGORY_OPTIONS}
            onChange={(value) => handleField('category', value)}
          />

          <SegmentedControl
            label="Campus type"
            name="campus_mode"
            value={data.campus_mode}
            options={CAMPUS_OPTIONS}
            onChange={(value) => handleField('campus_mode', value)}
          />

          <div className="field">
            <label className="field-label" htmlFor="ft-status">
              Status
            </label>
            <select
              id="ft-status"
              className="field-select"
              value={data.status}
              onChange={(event) => handleField('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </main>

      <footer className="panel-footer">
        <div id={hintId}>
          {parseHint ? <StatusMessage status={parseHintStatus} message={parseHint} /> : null}
        </div>
        <p id={selectionId} className="sr-only" aria-live="polite">
          {selectionMessage}
        </p>
        <div className="actions" aria-describedby={statusMessage ? statusMessageId : hintId}>
          <button
            type="submit"
            form="ft-save-form"
            className="btn btn-primary"
            disabled={saveStatus === 'saving'}
            aria-busy={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save opportunity'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={reread}
            disabled={metadataState === 'loading'}
          >
            {metadataState === 'loading' ? 'Reading page…' : 'Re-read page'}
          </button>
          {saveStatus === 'saved' ? (
            <a
              className="btn btn-secondary"
              href={`https://futuretracker.online${dashboardPath}`}
              target="_blank"
              rel="noreferrer"
            >
              View on dashboard
            </a>
          ) : null}
          <div id={statusMessageId}>
            <StatusMessage status={saveStatus} message={statusMessage} />
          </div>
        </div>
      </footer>
    </div>
  );
}
