import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import InterviewPrepDetail from './InterviewPrepDetail';
import { opportunityService, interviewPrepService, aiSettingsService, roundService } from '../services/api';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'opp-1' }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: jest.fn().mockResolvedValue('token'),
  }),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('../components/documents/AiSettingsModal', () => () => null);

jest.mock('../services/api', () => ({
  opportunityService: { getById: jest.fn() },
  interviewPrepService: {
    getPrep: jest.fn(),
    createPrep: jest.fn(),
    listStories: jest.fn(),
    seedStarter: jest.fn(),
    generate: jest.fn(),
    acceptGenerated: jest.fn(),
    updatePrep: jest.fn(),
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    createTopic: jest.fn(),
    updateTopic: jest.fn(),
    deleteTopic: jest.fn(),
    createBehavioral: jest.fn(),
    updateBehavioral: jest.fn(),
    deleteBehavioral: jest.fn(),
  },
  aiSettingsService: { get: jest.fn(), save: jest.fn(), remove: jest.fn() },
  roundService: { list: jest.fn() },
  setAuthTokenGetter: jest.fn(),
}));

describe('InterviewPrepDetail layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/internships/opp-1/prep?round=technical');
    opportunityService.getById.mockResolvedValue({
      id: 'opp-1',
      title: 'Systems Intern',
      category: 'internship',
      status: 'applied',
      description: 'Build the checkout service.',
      notes: 'Ask about on-call.',
    });
    roundService.list.mockResolvedValue([{ round_number: 1, round_type: 'technical', result: 'pending' }]);
    interviewPrepService.listStories.mockResolvedValue({ stories: [] });
    aiSettingsService.get.mockResolvedValue({ providers: [] });
    interviewPrepService.getPrep.mockResolvedValue({
      prep: { id: 'prep-1', company_research: '' },
      questions: [{ id: 'q1', question: 'Explain indexes', focus: 'technical', is_prepared: false }],
      topics: [],
      behavioral: [],
    });
  });

  it('puts the round action in the header and generation on the session tab', async () => {
    render(<InterviewPrepDetail />);

    expect(await screen.findByRole('heading', { name: 'Systems Intern' })).toBeInTheDocument();
    expect(screen.getByText('Technical interview')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start practice' })).toBeInTheDocument();
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add API key' })).toBeInTheDocument();
    expect(screen.queryByText('Build the checkout service.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Company Research' }));
    expect(screen.getByRole('heading', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByText('Build the checkout service.')).toBeInTheDocument();
    expect(screen.getByText('Ask about on-call.')).toBeInTheDocument();
  });

  it('replaces the page body while practicing and returns on close', async () => {
    render(<InterviewPrepDetail />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start practice' }));
    expect(screen.getByText('Explain indexes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Company Research' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Company Research' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
  });
});
