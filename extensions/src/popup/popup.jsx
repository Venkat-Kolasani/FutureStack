import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/chrome-extension';
import { saveOpportunity } from '../lib/api.js';

export default function Popup() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [data, setData] = useState({ title: '', description: '', link: '', category: 'internship', status: 'applied' });
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return;
      const fallbackLink = tab.url || '';
      setData(prev => ({ ...prev, link: fallbackLink }));
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (resp) setData(prev => ({ ...prev, ...resp, link: resp.link || fallbackLink }));
      });
    });
  }, []);

  if (!isLoaded) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#f1f5f9' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#6366f1' }}>FutureTracker</h2>
        <p>Please sign in first at</p>
        <a href="https://futuretracker.online/sign-in" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
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
      });
      setSaveStatus('saved');
    } catch (e) {
      console.error('FutureTracker: save failed', e);
      setSaveStatus('error');
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#6366f1', marginTop: 0 }}>FutureTracker</h2>
      <label>Title</label>
      <input
        id="ft-title"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        required
        aria-required="true"
        style={{ width: '100%', marginBottom: '10px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#f1f5f9' }}
      />
      <label>Description</label>
      <textarea
        value={data.description}
        onChange={(e) => setData({ ...data, description: e.target.value })}
        style={{ width: '100%', marginBottom: '10px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#f1f5f9', height: '80px' }}
      />
      <label>URL</label>
      <input
        value={data.link}
        readOnly
        style={{ width: '100%', marginBottom: '10px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#94a3b8' }}
      />
      <label>Category</label>
      <select
        value={data.category}
        onChange={(e) => setData({ ...data, category: e.target.value })}
        style={{ width: '100%', marginBottom: '10px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#f1f5f9' }}
      >
        <option value="internship">Internship</option>
        <option value="hackathon">Hackathon</option>
      </select>
      <label>Status</label>
      <select
        value={data.status}
        onChange={(e) => setData({ ...data, status: e.target.value })}
        style={{ width: '100%', marginBottom: '16px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#f1f5f9' }}
      >
        <option value="applied">Applied</option>
        <option value="shortlisted">Shortlisted</option>
        <option value="interviewed">Interviewed</option>
        <option value="selected">Selected</option>
        <option value="rejected">Rejected</option>
        <option value="ghosted">Ghosted</option>
      </select>
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving'}
        style={{ width: '100%', padding: '10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {saveStatus === 'saving' ? 'Saving...' : 'Save Opportunity'}
      </button>
      <div aria-live="polite">
        {saveStatus === 'saved' && <p style={{ color: '#22c55e', textAlign: 'center' }}>Saved successfully ✓</p>}
        {saveStatus === 'error' && <p style={{ color: '#ef4444', textAlign: 'center' }}>Failed to save. Try again.</p>}
        {saveStatus === 'missing-title' && <p style={{ color: '#ef4444', textAlign: 'center' }}>Please enter a title!</p>}
        {saveStatus === 'auth-error' && <p style={{ color: '#ef4444', textAlign: 'center' }}>Not signed in!</p>}
      </div>
    </div>
  );
}