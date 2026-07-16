import { fireEvent, render, screen } from '@testing-library/react';

import TeamManagementPanel from './TeamManagementPanel';

const renderPanel = () => {
    const onCreateInvite = jest.fn().mockResolvedValue({
        inviteUrl: 'https://futuretracker.online/hackathons/invites/single-use-token',
    });

    render(
        <TeamManagementPanel
            team={{ id: 'team-1', name: 'Builders' }}
            members={[]}
            access={{ role: 'owner' }}
            isLoading={false}
            onCreateTeam={jest.fn()}
            onUpdateTeam={jest.fn()}
            onAddMember={jest.fn()}
            onUpdateMember={jest.fn()}
            onRemoveMember={jest.fn()}
            onCreateInvite={onCreateInvite}
        />
    );

    return onCreateInvite;
};

describe('TeamManagementPanel invite modal', () => {
    it('clears a generated invite URL when Done closes the modal', async () => {
        const onCreateInvite = renderPanel();

        fireEvent.click(screen.getByRole('button', { name: 'Invite account' }));
        fireEvent.click(screen.getByRole('button', { name: 'Create invite' }));

        const inviteUrl = await screen.findByDisplayValue(/single-use-token/);
        expect(onCreateInvite).toHaveBeenCalledWith({ role: 'editor', expiresInHours: 168 });

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(inviteUrl).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Invite account' }));
        expect(screen.queryByDisplayValue(/single-use-token/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Create invite' })).toBeInTheDocument();
    });
});
