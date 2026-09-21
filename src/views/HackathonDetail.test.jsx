jest.mock('../services/api', () => ({
    opportunityService: {},
    hackathonService: {},
}));

import { mergeIdeaVoteResponse } from './HackathonDetail';

describe('mergeIdeaVoteResponse', () => {
    it('merges each completed vote response into the latest idea state', () => {
        const firstResponse = mergeIdeaVoteResponse([
            { id: 'idea-1', vote_count: 0 },
            { id: 'idea-2', vote_count: 0 },
        ], { id: 'idea-1', vote_count: 1, current_user_voted: true });

        const finalIdeas = mergeIdeaVoteResponse(
            firstResponse,
            { id: 'idea-2', vote_count: 1, current_user_voted: true }
        );

        expect(finalIdeas).toEqual([
            { id: 'idea-1', vote_count: 1, current_user_voted: true },
            { id: 'idea-2', vote_count: 1, current_user_voted: true },
        ]);
    });
});
