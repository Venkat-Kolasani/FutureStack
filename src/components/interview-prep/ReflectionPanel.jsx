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
import { parseReflection, serializeReflection } from '../../utils/interviewPrepSession';

const ReflectionPanel = ({ prep, onUpdate, isLoading }) => {
    const parsed = parseReflection(prep?.reflection_notes);
    const [fields, setFields] = useState({
        asked: parsed.legacy || parsed.asked,
        landed: parsed.landed,
        fix: parsed.fix,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState(null);

    useEffect(() => {
        const next = parseReflection(prep?.reflection_notes);
        setFields({
            asked: next.legacy || next.asked,
            landed: next.landed,
            fix: next.fix,
        });
    }, [prep]);

    const handleChange = (key, value) => {
        const next = { ...fields, [key]: value };
        setFields(next);

        if (saveTimeout) clearTimeout(saveTimeout);
        const timeout = setTimeout(async () => {
            setIsSaving(true);
            try {
                await onUpdate({ reflection_notes: serializeReflection(next) });
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

            <div className="space-y-4">
                {[
                    ['asked', 'What they asked'],
                    ['landed', 'What landed'],
                    ['fix', 'What to fix next'],
                ].map(([key, label]) => (
                    <label key={key} className="block">
                        <span className="text-sm text-gray-400">{label}</span>
                        <textarea
                            value={fields[key]}
                            onChange={(e) => handleChange(key, e.target.value)}
                            disabled={isLoading}
                            className="mt-1 w-full h-24 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                        />
                    </label>
                ))}
            </div>
        </div>
    );
};

export default ReflectionPanel;
