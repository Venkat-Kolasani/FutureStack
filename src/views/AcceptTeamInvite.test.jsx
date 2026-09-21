import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import AcceptTeamInvite from './AcceptTeamInvite';
import { hackathonService } from '../services/api';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ token: 'invite-token' }),
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../services/api', () => ({
  hackathonService: {
    acceptInvite: jest.fn(),
  },
  setAuthTokenGetter: jest.fn(),
}));

describe('AcceptTeamInvite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
      getToken: jest.fn().mockResolvedValue(null),
    });
  });

  it('renders without a navigate ReferenceError while auth is loading', () => {
    expect(() => render(<AcceptTeamInvite />)).not.toThrow();
    expect(screen.getByRole('heading', { name: 'Joining workspace' })).toBeInTheDocument();
    expect(hackathonService.acceptInvite).not.toHaveBeenCalled();
  });

  it('waits for a signed-in session before redeeming the invite', async () => {
    const { rerender } = render(<AcceptTeamInvite />);
    expect(hackathonService.acceptInvite).not.toHaveBeenCalled();

    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: jest.fn().mockResolvedValue('session-token'),
    });
    hackathonService.acceptInvite.mockResolvedValue({ opportunityId: 'hack-1' });
    rerender(<AcceptTeamInvite />);

    await waitFor(() => {
      expect(hackathonService.acceptInvite).toHaveBeenCalledWith('invite-token');
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/hackathons/hack-1');
    });
  });

  it('retries a 401 from a missing token instead of locking the invite', async () => {
    useAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      getToken: jest.fn().mockResolvedValue('session-token'),
    });
    hackathonService.acceptInvite
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ opportunityId: 'hack-1' });

    render(<AcceptTeamInvite />);

    await waitFor(() => {
      expect(hackathonService.acceptInvite).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/hackathons/hack-1');
    });
    expect(screen.queryByRole('heading', { name: 'Invite unavailable' })).not.toBeInTheDocument();
  });
});
