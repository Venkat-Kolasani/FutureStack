import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/context/ThemeContext';
import LandingPage from '@/components/marketing/LandingPage';

function renderLanding() {
  return render(
    <ThemeProvider>
      <LandingPage />
    </ThemeProvider>
  );
}

test('renders the landing page heading', () => {
  renderLanding();
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Build Your Future/i);
});

test('renders crawlable feature copy', () => {
  renderLanding();
  expect(screen.getByText(/Application Tracker/i)).toBeInTheDocument();
  expect(screen.getByText(/Hackathon Manager/i)).toBeInTheDocument();
});

test('uses in-app links for About while leaving hash section anchors', () => {
  renderLanding();
  expect(screen.getAllByRole('link', { name: 'About' })[0]).toHaveAttribute('href', '/about');
  expect(screen.getAllByRole('link', { name: 'Features' })[0]).toHaveAttribute('href', '#features');
});
