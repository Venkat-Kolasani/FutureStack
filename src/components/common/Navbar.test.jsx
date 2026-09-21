import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import Navbar from './Navbar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/internships',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Navbar', () => {
  it('marks the active route with aria-current="page"', () => {
    render(
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    );

    const internshipLinks = screen.getAllByRole('link', { name: 'Internships' });
    expect(internshipLinks[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).not.toHaveAttribute('aria-current');
  });

  it('closes the mobile drawer on Escape and restores focus to the toggle', () => {
    render(
      <ThemeProvider>
        <Navbar />
      </ThemeProvider>
    );

    const toggle = screen.getByRole('button', { name: /toggle menu/i });
    fireEvent.click(toggle);
    expect(document.getElementById('mobile-navigation')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('mobile-navigation')).toBeNull();
    expect(toggle).toHaveFocus();
  });
});
