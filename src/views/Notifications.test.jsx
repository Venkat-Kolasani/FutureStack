import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import Notifications from './Notifications';
import { notificationPreferenceService, notificationService } from '../services/api';

jest.mock('../services/api', () => ({
  notificationService: {
    list: jest.fn(),
    markRead: jest.fn(),
  },
  notificationPreferenceService: {
    get: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

function renderPage() {
  return render(<Notifications />);
}

describe('Notifications page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationService.list.mockResolvedValue([
      {
        id: 'notification-1',
        title: 'Deadline tomorrow',
        body: 'Your deadline is tomorrow.',
        created_at: '2026-07-16T00:00:00.000Z',
        read_at: null,
      },
    ]);
    notificationPreferenceService.get.mockResolvedValue({
      deadlineEmailEnabled: false,
      emailDeliveryAvailable: true,
    });
  });

  it('shows persisted in-app notifications and the email preference toggle', async () => {
    renderPage();

    expect(await screen.findByText('Deadline tomorrow')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable email deadline reminders' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
  });

  it('shows in-app notifications when loading email preferences fails', async () => {
    const error = new Error('Email preferences unavailable');
    notificationPreferenceService.get.mockRejectedValueOnce(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      renderPage();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Unable to load notification settings. Please try again.');
      });
      expect(await screen.findByText('Deadline tomorrow')).toBeInTheDocument();
      expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('saves the user-selected email preference', async () => {
    notificationPreferenceService.update.mockResolvedValue({
      deadlineEmailEnabled: true,
      emailDeliveryAvailable: true,
    });
    renderPage();

    const toggle = await screen.findByRole('checkbox', { name: 'Enable email deadline reminders' });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(notificationPreferenceService.update).toHaveBeenCalledWith({ deadlineEmailEnabled: true });
    });
    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Email deadline reminders enabled.');
  });

  it('marks an in-app notification as read', async () => {
    notificationService.markRead.mockResolvedValue({
      id: 'notification-1',
      read_at: '2026-07-16T01:00:00.000Z',
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Mark read' }));

    await waitFor(() => {
      expect(notificationService.markRead).toHaveBeenCalledWith('notification-1');
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
    });
  });
});
