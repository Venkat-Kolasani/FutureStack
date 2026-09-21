import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppShell } from './AppShell';

let pathname = '/dashboard';

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

function renderShell() {
  return render(
    <ThemeProvider>
      <AppShell>
        <p>invite body</p>
      </AppShell>
    </ThemeProvider>
  );
}

describe('AppShell', () => {
  it('hides the workspace navbar on team invite routes', () => {
    pathname = '/hackathons/invites/abc-token';
    renderShell();

    expect(screen.getByText('invite body')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('shows the workspace navbar on other app routes', () => {
    pathname = '/dashboard';
    renderShell();

    expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toBeInTheDocument();
  });
});
