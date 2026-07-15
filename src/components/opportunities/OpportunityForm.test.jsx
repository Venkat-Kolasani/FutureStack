import { render, screen } from '@testing-library/react';

jest.mock('../documents/DocumentSelector', () => () => null);

import OpportunityForm from './OpportunityForm';

describe('OpportunityForm', () => {
  it('uses the shared solid primary contrast variant for its submit action', () => {
    render(<OpportunityForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: 'Create Opportunity' });
    expect(submitButton).toHaveClass('bg-blue-600');
    expect(submitButton).toHaveClass('text-white');
    expect(submitButton).toHaveClass('hover:bg-blue-700');
    expect(submitButton).not.toHaveClass('text-blue-400');
  });
});
