/**
 * CompanyResearchPanel - Company research notes with autosave
 *
 * Features:
 * - Text area for company research notes
 * - Debounced autosave
 * - Save indicator
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaBuilding, FaSave } from 'react-icons/fa';

const CompanyResearchPanel = ({ prep, onUpdate, isLoading }) => {
    const [notes, setNotes] = useState(prep?.company_research || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState(null);

    useEffect(() => {
        setNotes(prep?.company_research || '');
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
                await onUpdate({ company_research: newNotes });
            } catch (error) {
                console.error('Error saving company research:', error);
                toast.error('Could not save company research. Please try again.');
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
                    <FaBuilding className="text-blue-400" size={16} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Research</h3>
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
                placeholder="Research the company's mission, culture, recent news, products, and any other relevant information..."
                className="w-full h-64 bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-gray-700 dark:text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <div className="mt-3 text-xs text-gray-500">
                Tips: Research company values, recent achievements, team structure, and how your skills align with their needs.
            </div>
        </div>
    );
};

export default CompanyResearchPanel;
