import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/chrome-extension';
import { saveOpportunity } from '../lib/api.js';

const inputStyle = {
  width: '100%',
  marginBottom: '12px',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid #27272a',
  background: '#111111',
  color: '#ffffff',
  fontSize: '13px',
  outline: 'none',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

export default function Popup() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [data, setData] = useState({ title: '', description: '', link: '', category: 'internship', status: 'applied' });
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (!tab?.id) return;
      const fallbackLink = tab.url || '';
      setData(prev => ({ ...prev, link: fallbackLink }));
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content.js'],
        });
        chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' }, (resp) => {
          if (chrome.runtime.lastError) return;
          if (resp) setData(prev => ({ ...prev, ...resp, link: resp.link || fallbackLink }));
        });
      } catch (e) {
        console.warn('FutureTracker: could not inject content script', e);
      }
    });
  }, []);

  if (!isLoaded) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#a1a1aa' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ background: '#ffffff', color: '#000000', fontWeight: 'bold', padding: '6px 10px', borderRadius: '6px', fontSize: '16px' }}>F</span>
          <span style={{ marginLeft: '8px', fontWeight: 'bold', fontSize: '18px' }}>FutureTracker</span>
        </div>
        <p style={{ color: '#a1a1aa', marginBottom: '12px' }}>Please sign in first at</p>
        <a href="https://futuretracker.online/sign-in" target="_blank" rel="noreferrer" style={{ color: '#6366f1', fontWeight: '500' }}>
          futuretracker.online
        </a>
      </div>
    );
  }

  async function handleSave() {
    if (!data.title) {
      setSaveStatus('missing-title');
      return;
    }
    setSaveStatus('saving');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const token = await getToken();
      if (!token) {
        setSaveStatus('auth-error');
        return;
      }
      await saveOpportunity(token, {
        title: data.title,
        description: data.description,
        link: data.link,
        category: data.category,
        status: data.status,
      }, controller.signal);
      setSaveStatus('saved');
    } catch (e) {
      console.error('FutureTracker: save failed', e);
      if (e.name === 'AbortError') {
        setSaveStatus('timeout');
      } else {
        setSaveStatus('error');
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #18181b' }}>
        <span style={{ background: '#ffffff', color: '#000000', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', marginRight: '8px' }}>F</span>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>FutureTracker</span>
      </div>
      <label>Title</label>
      <input
        id="ft-title"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        required
        aria-required="true"
        placeholder="Job title or role"
        style={inputStyle}
      />
      <label>Description</label>
      <textarea
        value={data.description}
        onChange={(e) => setData({ ...data, description: e.target.value })}
        placeholder="Optional description"
        style={{ ...inputStyle, height: '72px', resize: 'vertical' }}
      />
      <label>URL</label>
      <input
        value={data.link}
        readOnly
        style={{ ...inputStyle, color: '#71717a', marginBottom: '12px' }}
      />
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <label>Category</label>
          <select
            value={data.category}
            onChange={(e) => setData({ ...data, category: e.target.value })}
            style={selectStyle}
          >
            <option value="internship">Internship</option>
            <option value="hackathon">Hackathon</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Status</label>
          <select
            value={data.status}
            onChange={(e) => setData({ ...data, status: e.target.value })}
            style={selectStyle}
          >
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="interviewed">Interviewed</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="ghosted">Ghosted</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        style={{ width: '100%', padding: '10px', background: saveStatus === 'saving' ? '#4f46e5' : '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '14px' }}
      >
        {saveStatus === 'saving' ? 'Saving...' : 'Save Opportunity'}
      </button>
      <div aria-live="polite" style={{ marginTop: '10px', textAlign: 'center', fontSize: '13px' }}>
        {saveStatus === 'saved' && <p style={{ color: '#22c55e' }}>✓ Saved successfully!</p>}
        {saveStatus === 'error' && <p style={{ color: '#ef4444' }}>Failed to save. Try again.</p>}
        {saveStatus === 'timeout' && <p style={{ color: '#ef4444' }}>Request timed out. Try again.</p>}
        {saveStatus === 'missing-title' && <p style={{ color: '#ef4444' }}>Please enter a title!</p>}
        {saveStatus === 'auth-error' && <p style={{ color: '#ef4444' }}>Not signed in!</p>}
      </div>
    </div>
  );
}