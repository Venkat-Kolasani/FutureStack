import { render, screen } from '@testing-library/react';
import { MarketingDoc } from './MarketingDoc';

test('exposes a focusable main landmark for the skip link', () => {
  render(
    <MarketingDoc>
      <h1>Document title</h1>
    </MarketingDoc>
  );

  const main = screen.getByRole('main');
  expect(main).toHaveAttribute('id', 'main-content');
  expect(main).toHaveAttribute('tabindex', '-1');
  expect(main).toContainElement(screen.getByRole('heading', { name: 'Document title' }));
  expect(main).not.toContainElement(screen.getByRole('navigation', { name: 'Primary' }));
  expect(main).not.toContainElement(screen.getByRole('contentinfo'));
});
