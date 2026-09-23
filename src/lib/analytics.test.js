jest.unmock('./analytics');

import { redactedPageUrl } from './analytics';

describe('redactedPageUrl', () => {
    it('replaces a token-bearing path and drops query parameters and fragments', () => {
        window.history.pushState({}, '', '/hackathons/invites/single-use-token?source=email#invite');

        expect(redactedPageUrl('/hackathons/invites')).toBe(
            'http://localhost/hackathons/invites'
        );
    });
});
