import { fireEvent, render, screen } from '@testing-library/react';

import IdeaBrainstormingBoard from './IdeaBrainstormingBoard';

const renderBoard = (idea, onVoteIdea = jest.fn()) => {
    render(
        <IdeaBrainstormingBoard
            ideas={[idea]}
            hasTeam
            isLoading={false}
            onCreateIdea={jest.fn()}
            onUpdateIdea={jest.fn()}
            onDeleteIdea={jest.fn()}
            onVoteIdea={onVoteIdea}
        />
    );
    return onVoteIdea;
};

describe('IdeaBrainstormingBoard voting control', () => {
    const idea = {
        id: 'idea-1',
        title: 'Accessible project tracker',
        category: 'feature',
        vote_count: 3,
        current_user_voted: false,
    };

    it('describes the cast-vote action and exposes its unpressed state', () => {
        const onVoteIdea = renderBoard(idea);
        const voteButton = screen.getByRole('button', { name: 'Vote for this idea; 3 votes' });

        expect(voteButton).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(voteButton);
        expect(onVoteIdea).toHaveBeenCalledWith(idea);
    });

    it('describes the remove-vote action and exposes its pressed state', () => {
        renderBoard({ ...idea, current_user_voted: true });

        expect(screen.getByRole('button', { name: 'Remove your vote; 3 votes' }))
            .toHaveAttribute('aria-pressed', 'true');
    });
});
