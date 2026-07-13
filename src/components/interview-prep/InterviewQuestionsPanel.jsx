/**
 * InterviewQuestionsPanel - Common interview questions management
 * 
 * Features:
 * - Add/edit/delete questions
 * - Personal notes/answers for each question
 * - "Prepared" toggle
 */
import React, { useState } from 'react';
import { FaQuestionCircle, FaPlus, FaEdit, FaTrash, FaCheck } from 'react-icons/fa';
import Button from '../common/Button';

const InterviewQuestionsPanel = ({ questions, onCreateQuestion, onUpdateQuestion, onDeleteQuestion, isLoading }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ question: '', answer: '', is_prepared: false });
    const [error, setError] = useState(null);

    const resetForm = () => {
        setFormData({ question: '', answer: '', is_prepared: false });
        setShowAddForm(false);
        setEditingId(null);
        setError(null);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!formData.question.trim()) return;
        setError(null);

        try {
            await onCreateQuestion(formData);
            resetForm();
        } catch (error) {
            console.error('Error adding question:', error);
            setError(error.message || 'Failed to add question. Please try again.');
        }
    };

    const handleEdit = (question) => {
        setEditingId(question.id);
        setFormData({
            question: question.question,
            answer: question.answer || '',
            is_prepared: question.is_prepared
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!formData.question.trim()) return;

        try {
            await onUpdateQuestion(editingId, formData);
            resetForm();
        } catch (error) {
            console.error('Error updating question:', error);
        }
    };

    const handleDelete = async (questionId) => {
        if (!window.confirm('Are you sure you want to delete this question?')) return;

        try {
            await onDeleteQuestion(questionId);
        } catch (error) {
            console.error('Error deleting question:', error);
        }
    };

    const handleCancel = () => {
        resetForm();
    };

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FaQuestionCircle className="text-purple-400" size={16} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Common Interview Questions</h3>
                </div>
                {!showAddForm && !editingId && (
                    <Button
                        variant="outline"
                        onClick={() => setShowAddForm(true)}
                        disabled={isLoading}
                        className="!px-3 !py-1.5 text-xs"
                    >
                        <FaPlus className="mr-1.5" size={12} />
                        Add Question
                    </Button>
                )}
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
                                placeholder="e.g., Tell me about a challenging project you worked on"
                                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Answer / Notes</label>
                            <textarea
                                value={formData.answer}
                                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                                placeholder="Write your prepared answer or key points to remember..."
                                rows={3}
                                className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="prepared"
                                checked={formData.is_prepared}
                                onChange={(e) => setFormData({ ...formData, is_prepared: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-200 dark:border-white/10 bg-white dark:bg-black/50 text-purple-500 focus:ring-purple-500"
                            />
                            <label htmlFor="prepared" className="text-sm text-gray-700 dark:text-gray-300">Mark as prepared</label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" variant="primary" className="flex-1">
                                {editingId ? 'Update' : 'Add'} Question
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Questions List */}
            {questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <FaQuestionCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No questions added yet. Add common interview questions to prepare.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {questions.map((q) => (
                        <div
                            key={q.id}
                            className={`bg-black/5 dark:bg-white/5 rounded-lg p-4 border transition-all ${
                                q.is_prepared ? 'border-green-500/30' : 'border-gray-200 dark:border-white/10'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        {q.is_prepared && (
                                            <FaCheck className="text-green-400" size={12} />
                                        )}
                                        <p className="font-medium text-gray-900 dark:text-white">{q.question}</p>
                                    </div>
                                    {q.answer && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{q.answer}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleEdit(q)}
                                        disabled={isLoading}
                                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Edit"
                                    >
                                        <FaEdit size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(q.id)}
                                        disabled={isLoading}
                                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete"
                                    >
                                        <FaTrash size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InterviewQuestionsPanel;
