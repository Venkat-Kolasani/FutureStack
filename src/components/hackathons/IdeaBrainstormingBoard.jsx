/**
 * IdeaBrainstormingBoard - Display and manage hackathon ideas
 * 
 * Features:
 * - Add ideas with title, description, category
 * - Vote on ideas (simple increment)
 * - Mark idea as selected (finalized)
 * - Category badges (feature, design, tech, other)
 */
import React, { useState } from 'react';
import { FaPlus, FaTrash, FaLightbulb, FaThumbsUp, FaStar, FaCheck } from 'react-icons/fa';
import Button from '../common/Button';
import Modal from '../common/Modal';

const categoryConfig = {
    feature: { label: 'Feature', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    design: { label: 'Design', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    tech: { label: 'Tech', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    other: { label: 'Other', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' }
};

const IdeaBrainstormingBoard = ({
    ideas,
    hasTeam,
    onCreateIdea,
    onUpdateIdea,
    onDeleteIdea,
    onVoteIdea,
    isLoading
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('feature');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        await onCreateIdea({
            title: title.trim(),
            description: description.trim(),
            category
        });
        setTitle('');
        setDescription('');
        setCategory('feature');
        setShowAddModal(false);
    };

    const handleToggleSelected = async (idea) => {
        await onUpdateIdea(idea.id, { is_selected: !idea.is_selected });
    };

    // Sort ideas: selected first, then by votes
    const sortedIdeas = [...ideas].sort((a, b) => {
        if (a.is_selected && !b.is_selected) return -1;
        if (!a.is_selected && b.is_selected) return 1;
        return (b.votes || 0) - (a.votes || 0);
    });

    if (!hasTeam) {
        return (
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <FaLightbulb className="text-4xl mx-auto mb-4 text-gray-600" />
                    <p>Create a team first to start brainstorming ideas</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaLightbulb className="text-yellow-400" />
                        Ideas
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        Brainstorm and vote on project ideas
                    </p>
                </div>
                <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                    <FaPlus className="mr-2" />
                    Add Idea
                </Button>
            </div>

            {/* Ideas Grid */}
            {sortedIdeas.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <p>No ideas yet. Add your first idea!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedIdeas.map((idea) => (
                        <div
                            key={idea.id}
                            className={`relative rounded-lg p-4 border transition-all ${idea.is_selected
                                    ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
                                    : 'bg-black/5 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-white/20'
                                }`}
                        >
                            {/* Selected Badge */}
                            {idea.is_selected && (
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <FaStar size={10} />
                                    SELECTED
                                </div>
                            )}

                            {/* Category Badge */}
                            <span className={`inline-block text-xs px-2 py-1 rounded border mb-3 ${categoryConfig[idea.category]?.color || categoryConfig.other.color
                                }`}>
                                {categoryConfig[idea.category]?.label || 'Other'}
                            </span>

                            {/* Title & Description */}
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{idea.title}</h4>
                            {idea.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                                    {idea.description}
                                </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => onVoteIdea(idea.id)}
                                        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-400 transition-colors"
                                        title="Vote for this idea"
                                    >
                                        <FaThumbsUp size={14} />
                                        <span className="text-sm font-medium">{idea.votes || 0}</span>
                                    </button>
                                    <button
                                        onClick={() => handleToggleSelected(idea)}
                                        className={`flex items-center gap-1 transition-colors ${idea.is_selected
                                                ? 'text-yellow-400 hover:text-yellow-300'
                                                : 'text-gray-600 dark:text-gray-400 hover:text-yellow-400'
                                            }`}
                                        title={idea.is_selected ? 'Unselect idea' : 'Select as final idea'}
                                    >
                                        <FaCheck size={14} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => onDeleteIdea(idea.id)}
                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                    title="Delete idea"
                                >
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Idea Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Idea"
            >
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Idea Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., AI-powered study planner"
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your idea..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                                <option value="feature">Feature</option>
                                <option value="design">Design</option>
                                <option value="tech">Tech</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            Add Idea
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default IdeaBrainstormingBoard;
