import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import CalendarPage from './Calendar';
import { opportunityService, roundService } from '../services/api';

jest.mock('../services/api', () => ({
  opportunityService: { getAll: jest.fn() },
  roundService: { listUpcoming: jest.fn() },
}));

jest.mock('react-toastify', () => ({ toast: { error: jest.fn() } }));

jest.mock('next/dynamic', () => {
  const React = require('react');
  return () => function Calendar({ onActiveStartDateChange, tileContent, onChange }) {
    const [date, setDate] = React.useState(new Date(2026, 0, 1));
    const navigate = (months) => {
      const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
      setDate(next);
      onActiveStartDateChange?.({ activeStartDate: next, view: 'month' });
    };
    return (
      <div>
        <button onClick={() => navigate(-6)}>Previous six months</button>
        <button onClick={() => navigate(6)}>Next six months</button>
        <button onClick={() => onChange(date)}>Select first day</button>
        {tileContent({ date, view: 'month' })}
      </div>
    );
  };
});

const round = {
  id: 'round-1', opportunityTitle: 'July interview', scheduledDate: '2026-07-01',
  roundNumber: 1, roundType: 'technical',
};

describe('Calendar rounds', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 0, 15) });
    jest.resetAllMocks();
    opportunityService.getAll.mockResolvedValue([]);
    roundService.listUpcoming.mockResolvedValue([]);
  });

  afterEach(() => jest.useRealTimers());

  it('loads rounds after navigating beyond the initial window in either direction', async () => {
    roundService.listUpcoming.mockImplementation(async ({ from, to }) => (
      from <= round.scheduledDate && to >= round.scheduledDate ? [round] : []
    ));
    render(<CalendarPage />);
    fireEvent.click(await screen.findByText('Next six months'));
    expect(await screen.findByTitle('1 interview round(s)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Select first day'));
    expect(await screen.findByText('July interview')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    fireEvent.click(screen.getByText('Previous six months'));
    fireEvent.click(screen.getByText('Previous six months'));
    await waitFor(() => expect(roundService.listUpcoming).toHaveBeenLastCalledWith({
      from: '2025-06-24', to: '2025-08-07',
    }));
    expect(screen.queryByTitle('1 interview round(s)')).not.toBeInTheDocument();
  });

  it('does not let an older response replace the visible month rounds', async () => {
    let resolveOld;
    roundService.listUpcoming.mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce([round]);
    render(<CalendarPage />);
    fireEvent.click(await screen.findByText('Next six months'));
    fireEvent.click(screen.getByText('Next six months'));
    await waitFor(() => expect(roundService.listUpcoming).toHaveBeenCalledTimes(3));
    await act(async () => resolveOld([]));
    fireEvent.click(screen.getByText('Select first day'));
    expect(roundService.listUpcoming).toHaveBeenLastCalledWith({ from: '2026-12-25', to: '2027-02-07' });
    expect(screen.getByText('Interview Rounds').nextSibling).toHaveTextContent('1');
  });

  it('reports a failed request without getting stuck loading', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    roundService.listUpcoming.mockRejectedValueOnce(new Error('Unavailable'));
    render(<CalendarPage />);
    expect(await screen.findByText('Next six months')).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Failed to load calendar');
    error.mockRestore();
  });
});
