/**
 * TaskBoard - Kanban-style task management for hackathons
 * 
 * Features:
 * - Three columns: To Do, In Progress, Done
 * - Click-based status changes (dropdown)
 * - Priority levels with visual indicators
 * - Task assignment to team members
 */
import React, { useState } from 'react';
import { FaPlus, FaTrash, FaTasks, FaUser, FaFlag, FaCalendar } from 'react-icons/fa';
import Button from '../common/Button';
import Modal from '../common/Modal';

const statusConfig = {
    todo: { label: 'To Do', color: 'bg-gray-500/10 border-gray-500/30', headerColor: 'text-gray-600 dark:text-gray-400' },
    in_progress: { label: 'In Progress', color: 'bg-blue-500/10 border-blue-500/30', headerColor: 'text-blue-400' },
    done: { label: 'Done', color: 'bg-green-500/10 border-green-500/30', headerColor: 'text-green-400' }
};

const priorityConfig = {
    low: { label: 'Low', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/20' },
    medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/20' }
};

const TaskBoard = ({
    tasks,
    members,
    hasTeam,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    isLoading
}) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        await onCreateTask({
            title: title.trim(),
            description: description.trim(),
            assigned_to: assignedTo || null,
            priority,
            due_date: dueDate || null,
            status: 'todo'
        });
        resetForm();
        setShowAddModal(false);
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setAssignedTo('');
        setPriority('medium');
        setDueDate('');
    };

    const handleStatusChange = async (taskId, newStatus) => {
        await onUpdateTask(taskId, { status: newStatus });
    };

    // Group tasks by status
    const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'todo'),
        in_progress: tasks.filter(t => t.status === 'in_progress'),
        done: tasks.filter(t => t.status === 'done')
    };

    if (!hasTeam) {
        return (
            <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                    <FaTasks className="text-4xl mx-auto mb-4 text-gray-600" />
                    <p>Create a team first to manage tasks</p>
                </div>
            </div>
        );
    }

    const TaskCard = ({ task }) => (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-lg p-4 border border-gray-200 dark:border-white/10 hover:border-white/20 transition-all">
            {/* Priority Badge */}
            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded ${priorityConfig[task.priority]?.bg} ${priorityConfig[task.priority]?.color}`}>
                    <FaFlag className="inline mr-1" size={8} />
                    {priorityConfig[task.priority]?.label}
                </span>
                <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                >
                    <FaTrash size={12} />
                </button>
            </div>

            {/* Title */}
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{task.title}</h4>

            {/* Description */}
            {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                {task.assigned_to && (
                    <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                        <FaUser size={10} />
                        {task.assigned_to}
                    </span>
                )}
                {task.due_date && (
                    <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                        <FaCalendar size={10} />
                        {new Date(task.due_date).toLocaleDateString()}
                    </span>
                )}
            </div>

            {/* Status Dropdown */}
            <select
                value={task.status}
                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                className="w-full px-3 py-2 text-sm bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
                <option value="todo" className="bg-white dark:bg-gray-900">To Do</option>
                <option value="in_progress" className="bg-white dark:bg-gray-900">In Progress</option>
                <option value="done" className="bg-white dark:bg-gray-900">Done</option>
            </select>
        </div>
    );

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaTasks className="text-blue-400" />
                        Tasks
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        Manage and track hackathon tasks
                    </p>
                </div>
                <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                    <FaPlus className="mr-2" />
                    Add Task
                </Button>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {Object.entries(statusConfig).map(([status, config]) => (
                    <div key={status} className={`rounded-lg p-4 border ${config.color}`}>
                        <h4 className={`font-semibold mb-4 flex items-center gap-2 ${config.headerColor}`}>
                            {config.label}
                            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">
                                {tasksByStatus[status].length}
                            </span>
                        </h4>
                        <div className="space-y-3">
                            {tasksByStatus[status].length === 0 ? (
                                <p className="text-center text-gray-500 text-sm py-4">
                                    No tasks
                                </p>
                            ) : (
                                tasksByStatus[status].map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Task Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                title="Add New Task"
            >
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Task Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Set up database"
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                placeholder="Task details..."
                                rows={2}
                                className="w-full px-4 py-2.5 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Assign To
                                </label>
                                <select
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Unassigned</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Priority
                                </label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" type="button" onClick={() => { setShowAddModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit" disabled={isLoading}>
                            Add Task
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TaskBoard;
