jest.unmock('./analytics');

import { redactedPageUrl } from './analytics';

describe('redactedPageUrl', () => {
    it('keeps safe URL components while replacing a token-bearing path', () => {
        window.history.pushState({}, '', '/hackathons/invites/single-use-token?source=email#invite');

        expect(redactedPageUrl('/hackathons/invites')).toBe(
            'http://localhost/hackathons/invites?source=email#invite'
        );
    });
});
