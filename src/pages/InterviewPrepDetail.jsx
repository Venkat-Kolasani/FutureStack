/**
 * InterviewPrepDetail - Full interview preparation workspace page
 * 
 * Features:
 * - Tabbed interface: Overview, Company Research, Questions, Topics, Behavioral, Reflection
 * - Loads internship opportunity data
 * - Integrates all interview prep components
 * - Auto-creates prep record on first visit
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    FaArrowLeft,
    FaInfoCircle,
    FaBuilding,
    FaQuestionCircle,
    FaCode,
    FaUserTie,
    FaLightbulb,
    FaExternalLinkAlt,
    FaCalendar
} from 'react-icons/fa';

import SEO from '../components/seo/SEO';
import CompanyResearchPanel from '../components/interview-prep/CompanyResearchPanel';
import InterviewQuestionsPanel from '../components/interview-prep/InterviewQuestionsPanel';
import TechnicalTopicsPanel from '../components/interview-prep/TechnicalTopicsPanel';
import BehavioralPrepPanel from '../components/interview-prep/BehavioralPrepPanel';
import ReflectionPanel from '../components/interview-prep/ReflectionPanel';
import PrepProgressBar from '../components/interview-prep/PrepProgressBar';
import { opportunityService, interviewPrepService } from '../services/api';

const tabs = [
    { id: 'overview', label: 'Overview', icon: FaInfoCircle },
    { id: 'research', label: 'Company Research', icon: FaBuilding },
    { id: 'questions', label: 'Questions', icon: FaQuestionCircle },
    { id: 'topics', label: 'Topics', icon: FaCode },
    { id: 'behavioral', label: 'Behavioral', icon: FaUserTie },
    { id: 'reflection', label: 'Reflection', icon: FaLightbulb }
];

const statusColors = {
    applied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    shortlisted: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    interviewed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    selected: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    ghosted: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
};

const InterviewPrepDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // Data states
    const [internship, setInternship] = useState(null);
    const [prep, setPrep] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [topics, setTopics] = useState([]);
    const [behavioral, setBehavioral] = useState([]);

    // Load all data on mount
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load internship opportunity
            const opp = await opportunityService.getById(id);
            if (opp.category !== 'internship') {
                toast.error('This opportunity is not an internship');
                navigate('/internships');
                return;
            }
            setInternship(opp);

            // Load interview prep data
            try {
                const prepData = await interviewPrepService.getPrep(id);
                if (!prepData.prep) {
                    // Auto-create prep record if it doesn't exist
                    try {
                        const newPrep = await interviewPrepService.createPrep(id, {});
                        setPrep(newPrep.prep);
                        setQuestions([]);
                        setTopics([]);
                        setBehavioral([]);
                    } catch (createError) {
                        console.error('Error creating prep record:', createError);
                        toast.error('Failed to create interview prep. Please try again.');
                        setPrep(null);
                        setQuestions([]);
                        setTopics([]);
                        setBehavioral([]);
                    }
                } else {
                    setPrep(prepData.prep);
                    setQuestions(prepData.questions || []);
                    setTopics(prepData.topics || []);
                    setBehavioral(prepData.behavioral || []);
                }
            } catch (prepError) {
                // If tables don't exist, show empty state (user needs to run migration)
                if (prepError.response?.status === 503) {
                    console.warn('Interview prep tables not set up yet');
                    toast.info('Interview preparation features require database setup. See docs for migration SQL.');
                    setPrep(null);
                    setQuestions([]);
                    setTopics([]);
                    setBehavioral([]);
                } else {
                    throw prepError;
                }
            }

        } catch (error) {
            console.error('Error loading interview prep data:', error);
            toast.error('Failed to load interview prep');
            navigate('/internships');
        } finally {
            setLoading(false);
        }
    };

    // Prep handlers
    const handleUpdatePrep = async (data) => {
        try {
            const updated = await interviewPrepService.updatePrep(id, data);
            setPrep(updated);
        } catch (error) {
            console.error('Error updating prep:', error);
            toast.error('Failed to save. Please try again.');
        }
    };

    // Question handlers
    const handleCreateQuestion = async (data) => {
        setIsLoading(true);
        try {
            const question = await interviewPrepService.createQuestion(id, data);
            setQuestions([...questions, question]);
            toast.success('Question added!');
        } catch (error) {
            console.error('Error creating question:', error);
            toast.error(error.response?.data?.error || 'Failed to add question. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateQuestion = async (questionId, data) => {
        try {
            const updated = await interviewPrepService.updateQuestion(id, questionId, data);
            setQuestions(questions.map(q => q.id === questionId ? updated : q));
        } catch (error) {
            console.error('Error updating question:', error);
            toast.error(error.response?.data?.error || 'Failed to update question. Please try again.');
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        try {
            await interviewPrepService.deleteQuestion(id, questionId);
            setQuestions(questions.filter(q => q.id !== questionId));
            toast.success('Question deleted');
        } catch (error) {
            console.error('Error deleting question:', error);
            toast.error(error.response?.data?.error || 'Failed to delete question. Please try again.');
        }
    };

    // Topic handlers
    const handleCreateTopic = async (data) => {
        setIsLoading(true);
        try {
            const topic = await interviewPrepService.createTopic(id, data);
            setTopics([...topics, topic]);
            toast.success('Topic added!');
        } catch (error) {
            console.error('Error creating topic:', error);
            toast.error(error.response?.data?.error || 'Failed to add topic. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateTopic = async (topicId, data) => {
        try {
            const updated = await interviewPrepService.updateTopic(id, topicId, data);
            setTopics(topics.map(t => t.id === topicId ? updated : t));
        } catch (error) {
            console.error('Error updating topic:', error);
            toast.error(error.response?.data?.error || 'Failed to update topic. Please try again.');
        }
    };

    const handleDeleteTopic = async (topicId) => {
        try {
            await interviewPrepService.deleteTopic(id, topicId);
            setTopics(topics.filter(t => t.id !== topicId));
            toast.success('Topic deleted');
        } catch (error) {
            console.error('Error deleting topic:', error);
            toast.error(error.response?.data?.error || 'Failed to delete topic. Please try again.');
        }
    };

    // Behavioral handlers
    const handleCreateBehavioral = async (data) => {
        setIsLoading(true);
        try {
            const entry = await interviewPrepService.createBehavioral(id, data);
            setBehavioral([...behavioral, entry]);
            toast.success('Behavioral entry added!');
        } catch (error) {
            console.error('Error creating behavioral entry:', error);
            toast.error(error.response?.data?.error || 'Failed to add behavioral entry. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBehavioral = async (behavioralId, data) => {
        try {
            const updated = await interviewPrepService.updateBehavioral(id, behavioralId, data);
            setBehavioral(behavioral.map(b => b.id === behavioralId ? updated : b));
        } catch (error) {
            console.error('Error updating behavioral entry:', error);
            toast.error(error.response?.data?.error || 'Failed to update behavioral entry. Please try again.');
        }
    };

    const handleDeleteBehavioral = async (behavioralId) => {
        try {
            await interviewPrepService.deleteBehavioral(id, behavioralId);
            setBehavioral(behavioral.filter(b => b.id !== behavioralId));
            toast.success('Behavioral entry deleted');
        } catch (error) {
            console.error('Error deleting behavioral entry:', error);
            toast.error(error.response?.data?.error || 'Failed to delete behavioral entry. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading interview prep...</p>
                </div>
            </div>
        );
    }

    if (!internship) return null;

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-4 sm:p-6">
            <SEO
                title={`${internship.title} - Interview Prep`}
                description={`Interview preparation for ${internship.title}`}
                canonical={`/internships/${id}/prep`}
                noindex={true}
            />

            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/internships')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
                >
                    <FaArrowLeft />
                    Back to Internships
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {internship.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`text-sm px-3 py-1 rounded-full border ${statusColors[internship.status] || statusColors.applied}`}>
                                    {internship.status?.charAt(0).toUpperCase() + internship.status?.slice(1)}
                                </span>
                                {internship.deadline && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <FaCalendar size={12} />
                                        {new Date(internship.deadline).toLocaleDateString()}
                                    </span>
                                )}
                                {internship.link && (
                                    <a
                                        href={internship.link}
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

                {/* Progress Bar */}
                <div className="mb-6">
                    <PrepProgressBar questions={questions} topics={topics} behavioral={behavioral} />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-gray-200 dark:border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-white/10 text-gray-900 dark:text-white border-b-2 border-blue-500'
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
                            {internship.description ? (
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{internship.description}</p>
                            ) : (
                                <p className="text-gray-500 italic">No description provided</p>
                            )}
                            {internship.notes && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{internship.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'research' && (
                        <CompanyResearchPanel
                            prep={prep}
                            onUpdate={handleUpdatePrep}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'questions' && (
                        <InterviewQuestionsPanel
                            questions={questions}
                            onCreateQuestion={handleCreateQuestion}
                            onUpdateQuestion={handleUpdateQuestion}
                            onDeleteQuestion={handleDeleteQuestion}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'topics' && (
                        <TechnicalTopicsPanel
                            topics={topics}
                            onCreateTopic={handleCreateTopic}
                            onUpdateTopic={handleUpdateTopic}
                            onDeleteTopic={handleDeleteTopic}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'behavioral' && (
                        <BehavioralPrepPanel
                            behavioral={behavioral}
                            onCreateBehavioral={handleCreateBehavioral}
                            onUpdateBehavioral={handleUpdateBehavioral}
                            onDeleteBehavioral={handleDeleteBehavioral}
                            isLoading={isLoading}
                        />
                    )}

                    {activeTab === 'reflection' && (
                        <ReflectionPanel
                            prep={prep}
                            onUpdate={handleUpdatePrep}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewPrepDetail;
