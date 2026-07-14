/**
 * ReflectionPanel - Post-interview reflection notes
 *
 * Features:
 * - Text area for reflection notes
 * - Debounced autosave
 * - Save indicator
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaLightbulb, FaSave } from 'react-icons/fa';

const ReflectionPanel = ({ prep, onUpdate, isLoading }) => {
    const [notes, setNotes] = useState(prep?.reflection_notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState(null);

    useEffect(() => {
        setNotes(prep?.reflection_notes || '');
    }, [prep]);

    const handleChange = (e) => {
        const newNotes = e.target.value;
        setNotes(newNotes);

        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Set new timeout for autosave (debounce by 1 second)
        const timeout = setTimeout(async () => {
            setIsSaving(true);
            try {
                await onUpdate({ reflection_notes: newNotes });
            } catch (error) {
                console.error('Error saving reflection notes:', error);
                toast.error('Could not save reflection notes. Please try again.');
            } finally {
                setIsSaving(false);
            }
        }, 1000);

        setSaveTimeout(timeout);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [saveTimeout]);

    return (
        <div className="bg-white dark:bg-[#0A0A0A] rounded-xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FaLightbulb className="text-yellow-400" size={16} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Post-Interview Reflection</h3>
                </div>
                {isSaving && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                        <FaSave size={12} />
                        <span>Saving...</span>
                    </div>
                )}
            </div>

            <textarea
                value={notes}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Reflect on your interview: What went well? What could be improved? Any follow-up actions needed?"
                className="w-full h-48 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            />

            <div className="mt-3 text-xs text-gray-500">
                Tips: Note questions you struggled with, topics to review, and any follow-up emails or tasks.
            </div>
        </div>
    );
};

export default ReflectionPanel;
