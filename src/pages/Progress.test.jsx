import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Progress from './Progress';
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
  <button type="button" onClick={() => props.onDaySelect('2026-08-20')}>heatmap</button>
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
  return render(
    <HelmetProvider>
      <Progress />
    </HelmetProvider>
  );
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
});
