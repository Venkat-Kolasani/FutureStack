import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Progress from './Progress';
import { toast } from 'react-toastify';
import { progressService } from '../services/api';

jest.mock('../services/api', () => ({
  progressService: {
    listTracks: jest.fn(),
    createTrack: jest.fn(),
    listLogsByTrack: jest.fn(),
    listLogsByDate: jest.fn(),
    saveLog: jest.fn(),
    getHeatmap: jest.fn(),
  },
}));

jest.mock('../components/progress/HeatmapGrid', () => (props) => (
  <div>
    <button type="button" onClick={() => props.onDaySelect('2026-08-20')}>heatmap-20</button>
    <button type="button" onClick={() => props.onDaySelect('2026-08-21')}>heatmap-21</button>
  </div>
));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const track = {
  id: 'track-1',
  name: 'DSA',
  templateType: 'leetcode',
  isActive: true,
};

function renderPage() {
  return render(<Progress />);
}

describe('Progress page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    progressService.listTracks.mockResolvedValue([]);
    progressService.getHeatmap.mockResolvedValue([]);
    progressService.listLogsByDate.mockResolvedValue([]);
    progressService.listLogsByTrack.mockResolvedValue([]);
  });

  it('shows an empty state until a track exists', async () => {
    renderPage();
    expect(await screen.findByText('Start a prep track')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a track' })).toBeInTheDocument();
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('renders tracks, heatmap stats, and opens the log modal', async () => {
    progressService.listTracks.mockResolvedValue([track]);
    progressService.getHeatmap.mockResolvedValue([
      { date: '2026-08-20', count: 1, tracks: ['DSA'] },
    ]);
    progressService.listLogsByTrack.mockResolvedValue([
      {
        id: 'log-1',
        trackId: 'track-1',
        trackName: 'DSA',
        logDate: '2026-08-20',
        didLog: true,
        whatDidYouDo: 'Two graph problems',
        whatDidYouLearn: 'Visited-set placement',
        metadata: {},
      },
    ]);
    progressService.listLogsByDate.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'DSA' })).toBeInTheDocument();
    expect(screen.getByText('prep days in the last year')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Log today' })[0]);
    expect(await screen.findByText('What did you do?')).toBeInTheDocument();
  });

  it('fetches track histories only for active tracks', async () => {
    progressService.listTracks.mockResolvedValue([
      track,
      { ...track, id: 'track-2', name: 'Old system design', isActive: false },
      { id: 'track-3', name: 'Mock interviews', templateType: 'custom' },
    ]);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'DSA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mock interviews' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Old system design' })).not.toBeInTheDocument();
    expect(progressService.listLogsByTrack.mock.calls).toEqual([['track-1'], ['track-3']]);
  });

  it('skips track history requests when every track is inactive', async () => {
    progressService.listTracks.mockResolvedValue([{ ...track, isActive: false }]);

    renderPage();

    await waitFor(() => expect(progressService.listLogsByDate).toHaveBeenCalled());
    expect(progressService.listLogsByTrack).not.toHaveBeenCalled();
  });

  it('reports a failed track history request', async () => {
    progressService.listTracks.mockResolvedValue([track]);
    progressService.listLogsByTrack.mockRejectedValue(new Error('history unavailable'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Unable to load your prep log. Please try again.');
    });
    console.error.mockRestore();
  });

  it('ignores stale day log responses when the selected date changes quickly', async () => {
    progressService.listTracks.mockResolvedValue([track]);
    progressService.getHeatmap.mockResolvedValue([]);
    progressService.listLogsByTrack.mockResolvedValue([]);

    let resolveFirst;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    progressService.listLogsByDate.mockImplementation((date) => {
      if (date === '2026-08-20') {
        return firstPromise;
      }
      if (date === '2026-08-21') {
        return Promise.resolve([
          {
            id: 'log-21',
            trackId: 'track-1',
            trackName: 'DSA',
            logDate: '2026-08-21',
            didLog: true,
            whatDidYouDo: 'Latest day note',
            whatDidYouLearn: '',
            metadata: {},
          },
        ]);
      }
      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'DSA' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'heatmap-20' }));
    fireEvent.click(screen.getByRole('button', { name: 'heatmap-21' }));

    await waitFor(() => {
      expect(screen.getByText('Latest day note')).toBeInTheDocument();
    });

    resolveFirst([
      {
        id: 'log-20',
        trackId: 'track-1',
        trackName: 'DSA',
        logDate: '2026-08-20',
        didLog: true,
        whatDidYouDo: 'Stale day note',
        whatDidYouLearn: '',
        metadata: {},
      },
    ]);

    await waitFor(() => {
      expect(screen.getByText('Latest day note')).toBeInTheDocument();
    });
    expect(screen.queryByText('Stale day note')).not.toBeInTheDocument();
  });
});
