import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaChartLine, FaCalendarAlt, FaBoxOpen } from 'react-icons/fa';
import Button from './Button';

const EmptyState = ({
    icon: Icon = FaBoxOpen,
    title = 'No data yet',
    description = 'Get started by adding your first item.',
    actionLabel = null,
    actionPath = null,
    variant = 'default'
}) => {
    const navigate = useNavigate();

    // Pre-configured variants
    const variants = {
        opportunities: {
            icon: FaPlus,
            title: 'No opportunities yet',
            description: 'Start tracking your journey by adding your first internship or hackathon!',
            actionLabel: 'Add Opportunity',
            actionPath: '/add'
        },
        analytics: {
            icon: FaChartLine,
            title: 'No analytics data',
            description: 'Apply to opportunities to see your progress and insights here.',
            actionLabel: 'Go to Dashboard',
            actionPath: '/dashboard'
        },
        calendar: {
            icon: FaCalendarAlt,
            title: 'No upcoming deadlines',
            description: 'All clear! Add opportunities with deadlines to track them here.',
            actionLabel: 'Add Opportunity',
            actionPath: '/add'
        }
    };

    // Use variant config or custom props
    const config = variant !== 'default' ? variants[variant] : {};
    const FinalIcon = Icon !== FaBoxOpen ? Icon : (config.icon || FaBoxOpen);
    const finalTitle = title !== 'No data yet' ? title : (config.title || title);
    const finalDescription = description !== 'Get started by adding your first item.' ? description : (config.description || description);
    const finalActionLabel = actionLabel || config.actionLabel;
    const finalActionPath = actionPath || config.actionPath;

    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-6">
                <FinalIcon className="text-purple-400 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{finalTitle}</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">{finalDescription}</p>
            {finalActionLabel && finalActionPath && (
                <Button onClick={() => navigate(finalActionPath)} className="inline-flex items-center gap-2">
                    <FaPlus className="text-sm" />
                    {finalActionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;
