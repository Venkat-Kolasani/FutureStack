import Link from 'next/link';

export function MarketingDoc({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-root">
      <div className="wrap">
        <nav className="nav" aria-label="Primary">
          <Link className="brand" href="/">
            <span className="mark">F</span> FutureTracker.online
          </Link>
          <div className="nav-links">
            <Link href="/about">About</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/guides/internship-application-tracker">Guides</Link>
            <Link href="/">Open app</Link>
          </div>
        </nav>
        {children}
        <footer className="foot">
          <p>
            © FutureTracker.online · <Link href="/about">About</Link> · <Link href="/privacy">Privacy</Link> ·{' '}
            <Link href="/guides/internship-application-tracker">Guides</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
