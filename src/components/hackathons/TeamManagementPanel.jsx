/**
 * TeamManagementPanel - Displays and manages hackathon team members
 * 
 * Features:
 * - Create team with name and description
 * - Add/remove team members (name, role, email)
 * - Inline editing of member roles
 */
import React, { useState } from 'react';
import { FaPlus, FaTrash, FaUsers, FaUserPlus, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import Button from '../common/Button';
import Modal from '../common/Modal';

const TeamManagementPanel = ({
    team,
    members,
    onCreateTeam,
    onUpdateTeam,
    onAddMember,
    onUpdateMember,
    onRemoveMember,
    isLoading
}) => {
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState(null);
    const [editingRole, setEditingRole] = useState('');

    // Form states
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [memberName, setMemberName] = useState('');
    const [memberRole, setMemberRole] = useState('');
    const [memberEmail, setMemberEmail] = useState('');

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!teamName.trim()) return;

        await onCreateTeam({ name: teamName.trim(), description: teamDescription.trim() });
        setTeamName('');
        setTeamDescription('');
        setShowCreateTeamModal(false);
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!memberName.trim()) return;

        await onAddMember({
            name: memberName.trim(),
            role: memberRole.trim() || 'Member',
            email: memberEmail.trim() || null
        });
        setMemberName('');
        setMemberRole('');
        setMemberEmail('');
        setShowAddMemberModal(false);
    };

    const handleStartEditRole = (member) => {
        setEditingMemberId(member.id);
        setEditingRole(member.role || '');
    };

    const handleSaveRole = async (memberId) => {
        await onUpdateMember(memberId, { role: editingRole });
        setEditingMemberId(null);
        setEditingRole('');
    };

    const handleCancelEdit = () => {
        setEditingMemberId(null);
        setEditingRole('');
    };

    // If no team exists, show create team prompt
    if (!team) {
        return (
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                        <FaUsers className="text-2xl text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Team Yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                        Create a team to track your hackathon collaborators
                    </p>
                    <Button variant="primary" onClick={() => setShowCreateTeamModal(true)}>
                        <FaPlus className="mr-2" />
                        Create Team
                    </Button>
                </div>

                {/* Create Team Modal */}
                <Modal
                    isOpen={showCreateTeamModal}
                    onClose={() => setShowCreateTeamModal(false)}
                    title="Create Team"
                >
                    <form onSubmit={handleCreateTeam}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Team Name *
                                </label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="e.g., Code Crusaders"
                                    className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={teamDescription}
                                    onChange={(e) => setTeamDescription(e.target.value)}
                                    placeholder="Brief team description..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" type="button" onClick={() => setShowCreateTeamModal(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" type="submit" disabled={isLoading}>
                                Create Team
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    // Team exists - show team info and members
    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            {/* Team Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaUsers className="text-purple-400" />
                        {team.name}
                    </h3>
                    {team.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{team.description}</p>
                    )}
                </div>
                <Button variant="secondary" onClick={() => setShowAddMemberModal(true)}>
                    <FaUserPlus className="mr-2" />
                    Add Member
                </Button>
            </div>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="text-center py-6 text-gray-600 dark:text-gray-400">
                    <p>No team members yet. Add your first member!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {members.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between bg-black/5 dark:bg-white/5 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-gray-900 dark:text-white font-semibold">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                                    {editingMemberId === member.id ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="text"
                                                value={editingRole}
                                                onChange={(e) => setEditingRole(e.target.value)}
                                                className="px-2 py-1 text-xs bg-white/10 border border-white/20 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                placeholder="Role"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSaveRole(member.id)}
                                                className="text-green-400 hover:text-green-300"
                                            >
                                                <FaCheck size={12} />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <FaTimes size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            {member.role || 'Member'}
                                            <button
                                                onClick={() => handleStartEditRole(member)}
                                                className="text-gray-500 hover:text-gray-300"
                                            >
                                                <FaEdit size={10} />
                                            </button>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => onRemoveMember(member.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                title="Remove member"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Member Modal */}
            <Modal
                isOpen={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                title="Add Team Member"
            >
                <form onSubmit={handleAddMember}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={memberName}
                                onChange={(e) => setMemberName(e.target.value)}
                                placeholder="Team member's name"
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Role
                            </label>
                            <input
                                type="text"
                                value={memberRole}
                                onChange={(e) => setMemberRole(e.target.value)}
                                placeholder="e.g., Frontend Dev, Designer"
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email (optional)
                            </label>
                            <input
                                type="email"
                                value={memberEmail}
                                onChange={(e) => setMemberEmail(e.target.value)}
                                placeholder="member@example.com"
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" type="button" onClick={() => setShowAddMemberModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            Add Member
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeamManagementPanel;
