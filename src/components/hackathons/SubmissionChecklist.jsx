/**
 * SubmissionChecklist - Track hackathon submission requirements
 * 
 * Features:
 * - Add checklist items
 * - Toggle completion status
 * - Progress indicator
 * - Delete items
 */
import React, { useState } from 'react';
import { FaPlus, FaTrash, FaClipboardCheck, FaCheckCircle, FaCircle } from 'react-icons/fa';
import Button from '../common/Button';
import Modal from '../common/Modal';

const SubmissionChecklist = ({
    items,
    hasTeam,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    isLoading
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [title, setTitle] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        await onAddItem({ title: title.trim() });
        setTitle('');
        setShowAddModal(false);
    };

    const handleToggle = async (item) => {
        await onUpdateItem(item.id, { is_completed: !item.is_completed });
    };

    // Calculate progress
    const completedCount = items.filter(i => i.is_completed).length;
    const totalCount = items.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (!hasTeam) {
        return (
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <FaClipboardCheck className="text-4xl mx-auto mb-4 text-gray-600" />
                    <p>Create a team first to track submission requirements</p>
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
                        <FaClipboardCheck className="text-green-400" />
                        Submission Checklist
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        Track what you need to submit
                    </p>
                </div>
                <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                    <FaPlus className="mr-2" />
                    Add Item
                </Button>
            </div>

            {/* Progress Bar */}
            {totalCount > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className={`font-medium ${progressPercent === 100 ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {completedCount} / {totalCount} ({progressPercent}%)
                        </span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${progressPercent === 100
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Checklist Items */}
            {items.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <p>No checklist items yet. Add submission requirements!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${item.is_completed
                                    ? 'bg-green-500/5 border-green-500/20'
                                    : 'bg-black/5 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-white/20'
                                }`}
                        >
                            <button
                                onClick={() => handleToggle(item)}
                                className="flex items-center gap-3 flex-1 text-left"
                            >
                                {item.is_completed ? (
                                    <FaCheckCircle className="text-green-400 flex-shrink-0" size={20} />
                                ) : (
                                    <FaCircle className="text-gray-500 flex-shrink-0" size={20} />
                                )}
                                <span className={`font-medium ${item.is_completed
                                        ? 'text-gray-600 dark:text-gray-400 line-through'
                                        : 'text-gray-900 dark:text-white'
                                    }`}>
                                    {item.title}
                                </span>
                            </button>
                            <button
                                onClick={() => onDeleteItem(item.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-2"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Completion Message */}
            {totalCount > 0 && progressPercent === 100 && (
                <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center">
                    <p className="text-green-400 font-semibold">🎉 All items completed! Ready to submit!</p>
                </div>
            )}

            {/* Add Item Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Checklist Item"
            >
                <form onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Item Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Upload demo video"
                            className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            Add Item
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SubmissionChecklist;
