import { useEffect, useId, useState } from 'react';
import { useAuth } from '@clerk/chrome-extension';
import { saveOpportunity } from '../lib/api.js';
import { scrapePageInTab } from '../lib/metadata.js';
import './popup.css';

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

function BrandHeader({ subtitle }) {
  return (
    <header className="popup-header">
      <div className="brand-mark" aria-hidden="true">F</div>
      <div className="brand-copy">
        <h1 className="brand-title">FutureTracker</h1>
        {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
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

  const className = status === 'saved' ? 'status status-success' : 'status status-error';
  const role = status === 'saved' ? 'status' : 'alert';

  return (
    <p className={className} role={role} aria-live="polite">
      {message}
    </p>
  );
}

function LinkIcon() {
  return (
    <svg className="link-chip-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5a3 3 0 0 0 4.24.06l1.7-1.7a3 3 0 0 0-4.24-4.24L7.5 4.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 6.5a3 3 0 0 0-4.24-.06l-1.7 1.7a3 3 0 0 0 4.24 4.24L8.5 11.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Popup() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [data, setData] = useState({
    title: '',
    description: '',
    link: '',
    category: 'internship',
    status: 'applied',
    campus_mode: '',
  });
  const [metadataState, setMetadataState] = useState('loading');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const titleErrorId = useId();
  const statusMessageId = useId();

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab?.id) {
        setMetadataState('idle');
        return;
      }

      const fallbackLink = tab.url || '';
      setData((prev) => ({ ...prev, link: fallbackLink }));

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scrapePageInTab,
        });
        const resp = results?.[0]?.result;
        if (resp) {
          setData((prev) => ({
            ...prev,
            title: resp.title || prev.title,
            description: resp.description || prev.description,
            link: resp.link || fallbackLink,
          }));
        }
      } catch (e) {
        console.warn('FutureTracker: could not read page metadata', e);
      } finally {
        setMetadataState('idle');
      }
    });
  }, []);

  function updateField(name, value) {
    setData((prev) => ({ ...prev, [name]: value }));
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
    } catch (e) {
      console.error('FutureTracker: save failed', e);
      if (e.name === 'AbortError') {
        setSaveStatus('timeout');
        setSaveError('Request timed out. Try again.');
      } else {
        setSaveError(e?.message || 'Failed to save. Try again.');
        setSaveStatus('error');
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!isLoaded) {
    return (
      <div className="popup">
        <BrandHeader subtitle="Checking session…" />
        <div className="popup-center" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="state-title">Loading</p>
          <p className="state-copy">Connecting to your FutureTracker account.</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="popup">
        <BrandHeader subtitle="Quick save from any job page" />
        <div className="popup-center">
          <p className="state-title">Sign in required</p>
          <p className="state-copy">
            Sign in once on the website, then return here to save this listing.
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
  const statusMessage =
    saveStatus === 'saved'
      ? 'Saved. It’s on your FutureTracker board.'
      : saveStatus === 'missing-title'
        ? saveError
        : saveStatus === 'auth-error' || saveStatus === 'timeout' || saveStatus === 'error'
          ? saveError
          : '';

  return (
    <div className="popup">
      <BrandHeader
        subtitle={metadataState === 'loading' ? 'Reading page…' : 'Save this opportunity'}
      />

      <main className="popup-main">
        <form className="save-form" onSubmit={handleSave} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="ft-title">
              Title <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="ft-title"
              className="field-input"
              value={data.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Role or opportunity title"
              required
              aria-required="true"
              aria-invalid={saveStatus === 'missing-title'}
              aria-describedby={saveStatus === 'missing-title' ? titleErrorId : undefined}
              autoComplete="off"
            />
            {saveStatus === 'missing-title' ? (
              <p id={titleErrorId} className="field-error">
                Title is required.
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ft-description">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              id="ft-description"
              className="field-textarea"
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Short notes or summary"
            />
          </div>

          <div className="field">
            <span className="field-label" id="ft-url-label">
              Page link
            </span>
            <div className="link-chip" aria-labelledby="ft-url-label" title={data.link || 'No URL'}>
              <LinkIcon />
              <span className="link-chip-text">{data.link || 'No URL detected'}</span>
            </div>
            <span className="sr-only">{data.link}</span>
          </div>

          <SegmentedControl
            label="Category"
            name="category"
            value={data.category}
            options={CATEGORY_OPTIONS}
            onChange={(value) => updateField('category', value)}
          />

          <SegmentedControl
            label="Campus type"
            name="campus_mode"
            value={data.campus_mode}
            options={CAMPUS_OPTIONS}
            onChange={(value) => updateField('campus_mode', value)}
          />

          <div className="field">
            <label className="field-label" htmlFor="ft-status">
              Status
            </label>
            <select
              id="ft-status"
              className="field-select"
              value={data.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="actions" aria-describedby={statusMessage ? statusMessageId : undefined}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saveStatus === 'saving'}
              aria-busy={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save opportunity'}
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
        </form>
      </main>
    </div>
  );
}
