import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('uses in-app links for same-origin marketing pages and hash anchors for sections', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute(
      'href',
      '/guides/internship-application-tracker'
    );
    expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '#features');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');
  });
});
