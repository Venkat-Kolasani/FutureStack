import { fireEvent, render, screen } from '@testing-library/react';

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

  it('tracks internships by application date instead of an application deadline', () => {
    const onSubmit = jest.fn();
    render(<OpportunityForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/applied on/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/submission deadline/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Systems Intern' } });
    fireEvent.change(screen.getByLabelText(/applied on/i), { target: { value: '2026-07-16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Opportunity' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'internship',
      applied_on: '2026-07-16',
      deadline: null,
    }));
  });

  it('requires a submission deadline only for hackathons', () => {
    render(<OpportunityForm onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByLabelText('Hackathon'));
    fireEvent.change(screen.getByLabelText(/^title/i), { target: { value: 'Build Week' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Opportunity' }));

    expect(screen.getByText('Submission deadline is required')).toBeInTheDocument();
  });

  it('preserves a legacy internship close date during an unrelated edit', () => {
    const onSubmit = jest.fn();
    render(
      <OpportunityForm
        initialData={{
          title: 'Systems Intern',
          category: 'internship',
          deadline: '2026-06-30',
          applied_on: '2026-06-01',
        }}
        isEdit
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Update Opportunity' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      category: 'internship',
      applied_on: '2026-06-01',
    }));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('deadline');
  });
});
