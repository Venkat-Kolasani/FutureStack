import { render, screen } from '@testing-library/react';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
  it('exposes a polite loading state for dashboard chrome', () => {
    render(<PageSkeleton variant="dashboard" />);

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Loading').closest('[aria-busy="true"]')).toBeTruthy();
  });
});
