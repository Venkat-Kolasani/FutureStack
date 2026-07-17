import { render, screen } from '@testing-library/react';
import OpportunityCard from './OpportunityCard';

describe('OpportunityCard', () => {
  it('does not calculate an overdue state when a legacy hackathon has no submission date', () => {
    render(
      <OpportunityCard
        opportunity={{
          id: 'hackathon-1',
          title: 'Build Week',
          category: 'hackathon',
          status: 'applied',
          deadline: null,
        }}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.queryByText(/days remaining|overdue by/i)).not.toBeInTheDocument();
  });
});
