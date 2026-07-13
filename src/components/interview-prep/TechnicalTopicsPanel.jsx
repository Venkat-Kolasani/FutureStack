/**
 * TechnicalTopicsPanel - Technical topics to review with priority and status
 * 
 * Features:
 * - Add/edit/delete topics
 * - Priority levels (low, medium, high)
 * - "Reviewed" toggle
 * - Progress indicator
 */
import React, { useState } from 'react';
import { FaCode, FaPlus, FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import Button from '../common/Button';

const priorityColors = {
    low: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
    medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-400 border-red-500/20'
};

const TechnicalTopicsPanel = ({ topics, onCreateTopic, onUpdateTopic, onDeleteTopic, isLoading }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ topic: '', priority: 'medium', is_reviewed: false });
    const [error, setError] = useState(null);

    const resetForm = () => {
        setFormData({ topic: '', priority: 'medium', is_reviewed: false });
        setShowAddForm(false);
        setEditingId(null);
        setError(null);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.topic.trim()) return;
        setError(null);

        try {
            await onCreateTopic(formData);
            resetForm();
        } catch (error) {
            console.error('Error adding topic:', error);
            setError(error.message || 'Failed to add topic. Please try again.');
        }
    };

    const handleEdit = (topic) => {
        setEditingId(topic.id);
        setFormData({
            topic: topic.topic,
            priority: topic.priority,
            is_reviewed: topic.is_reviewed
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!formData.topic.trim()) return;

        try {
            await onUpdateTopic(editingId, formData);
            resetForm();
        } catch (error) {
            console.error('Error updating topic:', error);
        }
    };

    const handleDelete = async (topicId) => {
        if (!window.confirm('Are you sure you want to delete this topic?')) return;

        try {
            await onDeleteTopic(topicId);
        } catch (error) {
            console.error('Error deleting topic:', error);
        }
    };

    const handleCancel = () => {
        resetForm();
    };

    const reviewedCount = topics.filter(t => t.is_reviewed).length;
    const totalCount = topics.length;
    const progress = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FaCode className="text-green-400" size={16} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Technical Topics to Review</h3>
                    {totalCount > 0 && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">({reviewedCount}/{totalCount} reviewed)</span>
                    )}
                </div>
                {!showAddForm && !editingId && (
                    <Button
                        variant="outline"
                        onClick={() => setShowAddForm(true)}
                        disabled={isLoading}
                        className="!px-3 !py-1.5 text-xs"
                    >
                        <FaPlus className="mr-1.5" size={12} />
                        Add Topic
                    </Button>
                )}
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
                <div className="mb-4">
                    <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                </div>
            )}

            {/* Add/Edit Form */}
            {(showAddForm || editingId) && (
                <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-6 bg-black/5 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                    {error && (
                        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic</label>
                            <input
                                type="text"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                placeholder="e.g., React Hooks, System Design, Algorithms"
                                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="low" style={{ backgroundColor: '#111827' }}>Low</option>
                                <option value="medium" style={{ backgroundColor: '#111827' }}>Medium</option>
                                <option value="high" style={{ backgroundColor: '#111827' }}>High</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="reviewed"
                                checked={formData.is_reviewed}
                                onChange={(e) => setFormData({ ...formData, is_reviewed: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-green-500 focus:ring-green-500"
                            />
                            <label htmlFor="reviewed" className="text-sm text-gray-700 dark:text-gray-300">Mark as reviewed</label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" variant="primary" className="flex-1">
                                {editingId ? 'Update' : 'Add'} Topic
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Topics List */}
            {topics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FaCode size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No topics added yet. Add technical topics you need to review.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {topics.map((t) => (
                        <div
                            key={t.id}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                t.is_reviewed ? 'bg-green-500/5 border-green-500/20' : 'bg-black/5 dark:bg-white/5 border-gray-200 dark:border-white/10'
                            }`}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {t.is_reviewed && (
                                    <FaCheck className="text-green-400 shrink-0" size={12} />
                                )}
                                <span className={`font-medium text-gray-900 dark:text-white ${t.is_reviewed ? 'line-through opacity-60' : ''}`}>
                                    {t.topic}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs border shrink-0 ${priorityColors[t.priority]}`}>
                                    {t.priority}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => handleEdit(t)}
                                    disabled={isLoading}
                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Edit"
                                >
                                    <FaEdit size={12} />
                                </button>
                                <button
                                    onClick={() => handleDelete(t.id)}
                                    disabled={isLoading}
                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TechnicalTopicsPanel;
