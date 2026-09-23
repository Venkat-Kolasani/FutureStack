import { fireEvent, render, screen } from '@testing-library/react';
import { Providers } from './providers';
import ThemeToggle from '@/components/common/ThemeToggle';

describe('Providers', () => {
  beforeEach(() => {
    window.localStorage.setItem('futurestack-theme', 'dark');
  });

  it('renders children and toggles the theme class', async () => {
    render(
      <Providers>
        <ThemeToggle />
        <p>workspace ready</p>
      </Providers>
    );

    expect(screen.getByText('workspace ready')).toBeInTheDocument();
    const toggle = await screen.findByRole('button', { name: /switch to light mode/i });
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
