import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button contrast variants', () => {
  it('uses a self-contained solid primary style for opaque call-to-action buttons', () => {
    render(<Button variant="primarySolid">Create Opportunity</Button>);

    const button = screen.getByRole('button', { name: 'Create Opportunity' });
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('hover:bg-blue-700');
    expect(button).not.toHaveClass('text-blue-400');
  });

  it.each([
    ['primary', 'hover:bg-blue-700'],
    ['success', 'hover:bg-green-700'],
    ['danger', 'hover:bg-red-700'],
    ['warning', 'hover:bg-yellow-600'],
  ])('uses an accessible hover surface for the %s variant', (variant, hoverClass) => {
    render(<Button variant={variant}>Continue</Button>);

    expect(screen.getByRole('button', { name: 'Continue' })).toHaveClass(hoverClass);
  });
});
