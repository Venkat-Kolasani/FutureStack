/**
 * BehavioralPrepPanel - Behavioral question prep using STAR method
 * 
 * Features:
 * - Add/edit/delete behavioral prep entries
 * - STAR format fields (Situation, Task, Action, Result)
 */
import React, { useState } from 'react';
import { FaUserTie, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import Button from '../common/Button';

const BehavioralPrepPanel = ({ behavioral, onCreateBehavioral, onUpdateBehavioral, onDeleteBehavioral, isLoading }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        situation: '',
        task: '',
        action: '',
        result: ''
    });
    const [error, setError] = useState(null);

    const resetForm = () => {
        setFormData({ question: '', situation: '', task: '', action: '', result: '' });
        setShowAddForm(false);
        setEditingId(null);
        setError(null);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.question.trim()) return;
        setError(null);

        try {
            await onCreateBehavioral(formData);
            resetForm();
        } catch (error) {
            console.error('Error adding behavioral prep:', error);
            setError(error.message || 'Failed to add behavioral prep entry. Please try again.');
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry.id);
        setFormData({
            question: entry.question,
            situation: entry.situation || '',
            task: entry.task || '',
            action: entry.action || '',
            result: entry.result || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!formData.question.trim()) return;

        try {
            await onUpdateBehavioral(editingId, formData);
            resetForm();
        } catch (error) {
            console.error('Error updating behavioral prep:', error);
        }
    };

    const handleDelete = async (behavioralId) => {
        if (!window.confirm('Are you sure you want to delete this entry?')) return;

        try {
            await onDeleteBehavioral(behavioralId);
        } catch (error) {
            console.error('Error deleting behavioral prep:', error);
        }
    };

    const handleCancel = () => {
        resetForm();
    };

    const isComplete = (entry) => entry.situation?.trim() && entry.task?.trim() && entry.action?.trim() && entry.result?.trim();

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FaUserTie className="text-orange-400" size={16} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Behavioral Question Prep (STAR)</h3>
                </div>
                {!showAddForm && !editingId && (
                    <Button
                        variant="outline"
                        onClick={() => setShowAddForm(true)}
                        disabled={isLoading}
                        className="!px-3 !py-1.5 text-xs"
                    >
                        <FaPlus className="mr-1.5" size={12} />
                        Add Entry
                    </Button>
                )}
            </div>

            {/* STAR Method Guide */}
            <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>STAR Method:</strong> Structure your answers using Situation, Task, Action, and Result for clear, compelling responses.
                </p>
            </div>

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
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                            <input
                                type="text"
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                placeholder="e.g., Tell me about a time you led a team"
                                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Situation</label>
                                <textarea
                                    value={formData.situation}
                                    onChange={(e) => setFormData({ ...formData, situation: e.target.value })}
                                    placeholder="Describe the context..."
                                    rows={2}
                                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task</label>
                                <textarea
                                    value={formData.task}
                                    onChange={(e) => setFormData({ ...formData, task: e.target.value })}
                                    placeholder="What was your responsibility?"
                                    rows={2}
                                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
                                <textarea
                                    value={formData.action}
                                    onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                    placeholder="What steps did you take?"
                                    rows={2}
                                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Result</label>
                                <textarea
                                    value={formData.result}
                                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                    placeholder="What was the outcome?"
                                    rows={2}
                                    className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" variant="primary" className="flex-1">
                                {editingId ? 'Update' : 'Add'} Entry
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Entries List */}
            {behavioral.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FaUserTie size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No behavioral prep entries yet. Add questions and prepare STAR responses.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {behavioral.map((entry) => (
                        <div
                            key={entry.id}
                            className={`bg-black/5 dark:bg-white/5 rounded-lg p-4 border transition-all ${
                                isComplete(entry) ? 'border-orange-500/30' : 'border-gray-200 dark:border-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <p className="font-medium text-gray-900 dark:text-white flex-1">{entry.question}</p>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleEdit(entry)}
                                        disabled={isLoading}
                                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Edit"
                                    >
                                        <FaEdit size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(entry.id)}
                                        disabled={isLoading}
                                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white dark:bg-black/30 rounded p-2">
                                    <span className="text-orange-400 font-medium">S:</span>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{entry.situation || '—'}</p>
                                </div>
                                <div className="bg-white dark:bg-black/30 rounded p-2">
                                    <span className="text-orange-400 font-medium">T:</span>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{entry.task || '—'}</p>
                                </div>
                                <div className="bg-white dark:bg-black/30 rounded p-2">
                                    <span className="text-orange-400 font-medium">A:</span>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{entry.action || '—'}</p>
                                </div>
                                <div className="bg-white dark:bg-black/30 rounded p-2">
                                    <span className="text-orange-400 font-medium">R:</span>
                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">{entry.result || '—'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BehavioralPrepPanel;
