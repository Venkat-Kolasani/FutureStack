import { render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import EditOpportunity from './EditOpportunity';
import { opportunityService } from '../services/api';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'opp-1' }),
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('../services/api', () => ({
  opportunityService: {
    getById: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../components/opportunities/OpportunityForm', () => () => (
  <form aria-label="edit-opportunity-form" />
));

describe('EditOpportunity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    opportunityService.getById.mockResolvedValue({
      id: 'opp-1',
      title: 'Systems Intern',
      category: 'internship',
    });
  });

  it('renders without a navigate ReferenceError and loads the opportunity', async () => {
    expect(() => render(<EditOpportunity />)).not.toThrow();

    expect(screen.getByText('Loading opportunity...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Edit Opportunity' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'edit-opportunity-form' })).toBeInTheDocument();
    await waitFor(() => {
      expect(opportunityService.getById).toHaveBeenCalledWith('opp-1');
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
