/**
 * HackathonDetail - Full hackathon workspace page
 * 
 * Features:
 * - Tabbed interface: Overview, Team, Ideas, Tasks, Checklist
 * - Loads hackathon opportunity data
 * - Integrates all collaboration components
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    FaArrowLeft, FaInfoCircle, FaUsers, FaLightbulb,
    FaTasks, FaClipboardCheck, FaExternalLinkAlt, FaCalendar
} from 'react-icons/fa';

import SEO from '../components/seo/SEO';
import TeamManagementPanel from '../components/hackathons/TeamManagementPanel';
import IdeaBrainstormingBoard from '../components/hackathons/IdeaBrainstormingBoard';
import TaskBoard from '../components/hackathons/TaskBoard';
import SubmissionChecklist from '../components/hackathons/SubmissionChecklist';
import { opportunityService, hackathonService } from '../services/api';

const tabs = [
    { id: 'overview', label: 'Overview', icon: FaInfoCircle },
    { id: 'team', label: 'Team', icon: FaUsers },
    { id: 'ideas', label: 'Ideas', icon: FaLightbulb },
    { id: 'tasks', label: 'Tasks', icon: FaTasks },
    { id: 'checklist', label: 'Checklist', icon: FaClipboardCheck }
];

const statusColors = {
    applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    shortlisted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    interviewed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    selected: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    ghosted: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
};

const HackathonDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Data states
    const [hackathon, setHackathon] = useState(null);
    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [ideas, setIdeas] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [checklist, setChecklist] = useState([]);

    // Load all data on mount
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load hackathon opportunity
            const opp = await opportunityService.getById(id);
            if (opp.category !== 'hackathon') {
                toast.error('This opportunity is not a hackathon');
                navigate('/hackathons');
                return;
            }
            setHackathon(opp);

            // Load team and related data
            try {
                const teamData = await hackathonService.getTeam(id);
                setTeam(teamData.team);
                setMembers(teamData.members || []);

                // Load ideas, tasks, checklist
                const [ideasData, tasksData, checklistData] = await Promise.all([
                    hackathonService.getIdeas(id),
                    hackathonService.getTasks(id),
                    hackathonService.getChecklist(id)
                ]);
                setIdeas(ideasData);
                setTasks(tasksData);
                setChecklist(checklistData);
            } catch (teamError) {
                // If tables don't exist, show empty state (user needs to run migration)
                if (teamError.response?.status === 503) {
                    console.warn('Hackathon collaboration tables not set up yet');
                    toast.info('Team collaboration features require database setup. See docs for migration SQL.');
                }
                // Continue with null team - components will show empty/setup state
                setTeam(null);
                setMembers([]);
                setIdeas([]);
                setTasks([]);
                setChecklist([]);
            }

        } catch (error) {
            console.error('Error loading hackathon data:', error);
            toast.error('Failed to load hackathon');
            navigate('/hackathons');
        } finally {
            setLoading(false);
        }
    };

    // Team handlers
    const handleCreateTeam = async (data) => {
        setIsLoading(true);
        try {
            const result = await hackathonService.createTeam(id, data);
            setTeam(result.team);
            setMembers(result.members || []);
            toast.success('Team created!');
        } catch (error) {
            console.error('Error creating team:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (data) => {
        setIsLoading(true);
        try {
            const member = await hackathonService.addMember(id, data);
            setMembers([...members, member]);
            toast.success('Team member added!');
        } catch (error) {
            console.error('Error adding member:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateMember = async (memberId, data) => {
        try {
            const updated = await hackathonService.updateMember(id, memberId, data);
            setMembers(members.map(m => m.id === memberId ? updated : m));
        } catch (error) {
            console.error('Error updating member:', error);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await hackathonService.removeMember(id, memberId);
            setMembers(members.filter(m => m.id !== memberId));
            toast.success('Team member removed');
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    // Ideas handlers
    const handleCreateIdea = async (data) => {
        setIsLoading(true);
        try {
            const idea = await hackathonService.createIdea(id, data);
            setIdeas([idea, ...ideas]);
            toast.success('Idea added!');
        } catch (error) {
            console.error('Error creating idea:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateIdea = async (ideaId, data) => {
        try {
            const updated = await hackathonService.updateIdea(id, ideaId, data);
            setIdeas(ideas.map(i => i.id === ideaId ? updated : i));
        } catch (error) {
            console.error('Error updating idea:', error);
        }
    };

    const handleDeleteIdea = async (ideaId) => {
        try {
            await hackathonService.deleteIdea(id, ideaId);
            setIdeas(ideas.filter(i => i.id !== ideaId));
            toast.success('Idea deleted');
        } catch (error) {
            console.error('Error deleting idea:', error);
        }
    };

    const handleVoteIdea = async (ideaId) => {
        try {
            const updated = await hackathonService.voteIdea(id, ideaId);
            setIdeas(ideas.map(i => i.id === ideaId ? updated : i));
        } catch (error) {
            console.error('Error voting on idea:', error);
        }
    };

    // Tasks handlers
    const handleCreateTask = async (data) => {
        setIsLoading(true);
        try {
            const task = await hackathonService.createTask(id, data);
            setTasks([...tasks, task]);
            toast.success('Task added!');
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateTask = async (taskId, data) => {
        try {
            const updated = await hackathonService.updateTask(id, taskId, data);
            setTasks(tasks.map(t => t.id === taskId ? updated : t));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await hackathonService.deleteTask(id, taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
            toast.success('Task deleted');
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    // Checklist handlers
    const handleAddChecklistItem = async (data) => {
        setIsLoading(true);
        try {
            const item = await hackathonService.addChecklistItem(id, data);
            setChecklist([...checklist, item]);
            toast.success('Checklist item added!');
        } catch (error) {
            console.error('Error adding checklist item:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateChecklistItem = async (itemId, data) => {
        try {
            const updated = await hackathonService.updateChecklistItem(id, itemId, data);
            setChecklist(checklist.map(i => i.id === itemId ? updated : i));
        } catch (error) {
            console.error('Error updating checklist item:', error);
        }
    };

    const handleDeleteChecklistItem = async (itemId) => {
        try {
            await hackathonService.deleteChecklistItem(id, itemId);
            setChecklist(checklist.filter(i => i.id !== itemId));
            toast.success('Checklist item deleted');
        } catch (error) {
            console.error('Error deleting checklist item:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading hackathon...</p>
                </div>
            </div>
        );
    }

    if (!hackathon) return null;

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-4 sm:p-6">
            <SEO
                title={hackathon.title}
                description={`Manage your hackathon project: ${hackathon.title}`}
                canonical={`/hackathons/${id}`}
                noindex={true}
            />

            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/hackathons')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                >
                    <FaArrowLeft />
                    Back to Hackathons
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {hackathon.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`text-sm px-3 py-1 rounded-full border ${statusColors[hackathon.status] || statusColors.applied}`}>
                                    {hackathon.status?.charAt(0).toUpperCase() + hackathon.status?.slice(1)}
                                </span>
                                {hackathon.deadline && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <FaCalendar size={12} />
                                        {new Date(hackathon.deadline).toLocaleDateString()}
                                    </span>
                                )}
                                {hackathon.link && (
                                    <a
                                        href={hackathon.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        <FaExternalLinkAlt size={10} />
                                        Website
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-200 dark:border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-white/10 text-gray-900 dark:text-white border-b-2 border-purple-500'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FaInfoCircle className="text-blue-400" />
                                Overview
                            </h3>
                            {hackathon.description ? (
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{hackathon.description}</p>
                            ) : (
                                <p className="text-gray-500 italic">No description provided</p>
                            )}
                            {hackathon.notes && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{hackathon.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'team' && (
                        <TeamManagementPanel
                            team={team}
                            members={members}
                            onCreateTeam={handleCreateTeam}
                            onAddMember={handleAddMember}
                            onUpdateMember={handleUpdateMember}
                            onRemoveMember={handleRemoveMember}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'ideas' && (
                        <IdeaBrainstormingBoard
                            ideas={ideas}
                            hasTeam={!!team}
                            onCreateIdea={handleCreateIdea}
                            onUpdateIdea={handleUpdateIdea}
                            onDeleteIdea={handleDeleteIdea}
                            onVoteIdea={handleVoteIdea}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'tasks' && (
                        <TaskBoard
                            tasks={tasks}
                            members={members}
                            hasTeam={!!team}
                            onCreateTask={handleCreateTask}
                            onUpdateTask={handleUpdateTask}
                            onDeleteTask={handleDeleteTask}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'checklist' && (
                        <SubmissionChecklist
                            items={checklist}
                            hasTeam={!!team}
                            onAddItem={handleAddChecklistItem}
                            onUpdateItem={handleUpdateChecklistItem}
                            onDeleteItem={handleDeleteChecklistItem}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default HackathonDetail;
