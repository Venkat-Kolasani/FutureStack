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

function BrandHeader({ subtitle }) {
  return (
    <header className="popup-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">F</div>
        <div className="brand-copy">
          <h1 className="brand-title">FutureTracker</h1>
          {subtitle ? <p className="brand-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <span className="header-badge">Extension</span>
    </header>
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

export default function Popup() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [data, setData] = useState({
    title: '',
    description: '',
    link: '',
    category: 'internship',
    status: 'applied',
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
            ...resp,
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
        setSaveError('Your session expired. Sign in again at futuretracker.online.');
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
        <BrandHeader subtitle="Preparing your workspace" />
        <div className="popup-center" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <p className="state-title">Loading</p>
          <p className="state-copy">Checking your FutureTracker session…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="popup">
        <BrandHeader subtitle="Save opportunities from any job page" />
        <div className="popup-center">
          <p className="state-title">Sign in to save</p>
          <p className="state-copy">
            Open FutureTracker in your browser, sign in once, then return here to capture this listing.
          </p>
          <a
            className="btn btn-primary"
            href="https://futuretracker.online/sign-in"
            target="_blank"
            rel="noreferrer"
          >
            Go to futuretracker.online
          </a>
        </div>
      </div>
    );
  }

  const statusMessage =
    saveStatus === 'saved'
      ? 'Saved successfully. View it on your FutureTracker dashboard.'
      : saveStatus === 'missing-title'
        ? saveError
        : saveStatus === 'auth-error' || saveStatus === 'timeout' || saveStatus === 'error'
          ? saveError
          : '';

  return (
    <div className="popup">
      <BrandHeader
        subtitle={
          metadataState === 'loading'
            ? 'Reading this page…'
            : 'Capture this opportunity'
        }
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
              placeholder="e.g. React Intern at ABC Company"
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
              Description
            </label>
            <textarea
              id="ft-description"
              className="field-textarea"
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief description of the opportunity"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ft-url">
              Link
            </label>
            <input
              id="ft-url"
              className="field-input field-input-readonly"
              value={data.link}
              readOnly
              title={data.link}
              aria-readonly="true"
            />
            <p className="field-hint">Captured from the current tab.</p>
          </div>

          <fieldset className="field">
            <legend className="field-label">Category</legend>
            <div className="radio-group" role="radiogroup" aria-label="Opportunity category">
              <label className="radio-option">
                <input
                  type="radio"
                  name="category"
                  value="internship"
                  checked={data.category === 'internship'}
                  onChange={(e) => updateField('category', e.target.value)}
                />
                Internship
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="category"
                  value="hackathon"
                  checked={data.category === 'hackathon'}
                  onChange={(e) => updateField('category', e.target.value)}
                />
                Hackathon
              </label>
            </div>
          </fieldset>

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
              {saveStatus === 'saving' ? 'Saving…' : 'Save Opportunity'}
            </button>

            {saveStatus === 'saved' ? (
              <a
                className="btn btn-secondary"
                href="https://futuretracker.online/internships"
                target="_blank"
                rel="noreferrer"
              >
                Open dashboard
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
