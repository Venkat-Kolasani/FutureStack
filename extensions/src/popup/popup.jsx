import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/chrome-extension';
import { saveOpportunity } from '../lib/api.js';

export default function Popup() {
  const { isSignedIn, getToken } = useAuth();
  const [data, setData] = useState({ title: '', description: '', link: '' });
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_METADATA' }, (resp) => {
        if (resp) setData(resp);
      });
    });
  }, []);

  if (!isSignedIn) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2 style={{ color: '#6366f1' }}>FutureTracker</h2>
        <p>Please sign in first at</p>
        
          href="https://futuretracker.online/sign-in"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#6366f1' }}
        >
          futuretracker.online
        </a>
      </div>
    );
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const token = await getToken();
      await saveOpportunity(token, {
        title: data.title,
        description: data.description,
        link: data.link,
        category: 'internship',
        status: 'applied',
      });
      setStatus('saved');
    } catch (e) {
      setStatus('error');
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#6366f1', marginTop: 0 }}>FutureTracker</h2>
      <label>Title</label>
      <input
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
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
        style={{ width: '100%', marginBottom: '16px', padding: '6px', borderRadius: '4px', border: 'none', background: '#1e293b', color: '#94a3b8' }}
      />
      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        style={{ width: '100%', padding: '10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {status === 'saving' ? 'Saving...' : 'Save Opportunity'}
      </button>
      {status === 'saved' && <p style={{ color: '#22c55e', textAlign: 'center' }}>Saved successfully ✓</p>}
      {status === 'error' && <p style={{ color: '#ef4444', textAlign: 'center' }}>Failed to save. Try again.</p>}
    </div>
  );
}