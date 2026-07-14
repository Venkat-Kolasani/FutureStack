import React from 'react';

const LoadingSpinner = ({
    size = 'md',
    color = 'purple',
    text = null,
    fullScreen = false,
    className = ''
}) => {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-2',
        lg: 'h-12 w-12 border-3',
        xl: 'h-16 w-16 border-4'
    };

    const colorClasses = {
        purple: 'border-purple-500',
        blue: 'border-blue-500',
        green: 'border-green-500',
        white: 'border-white'
    };

    const spinnerClasses = `animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} border-t-transparent`;

    if (fullScreen) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                    <div className={spinnerClasses}></div>
                    {text && <p className="text-gray-900 dark:text-white mt-4 text-lg">{text}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <div className={spinnerClasses}></div>
            {text && <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{text}</p>}
        </div>
    );
};

export const SkeletonCard = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-800/50 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
    </div>
);

export const SkeletonChart = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-800/30 rounded-xl p-6 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-48 bg-gray-700/50 rounded-lg flex items-end justify-around p-4">
            <div className="w-8 h-20 bg-gray-600 rounded"></div>
            <div className="w-8 h-32 bg-gray-600 rounded"></div>
            <div className="w-8 h-24 bg-gray-600 rounded"></div>
            <div className="w-8 h-36 bg-gray-600 rounded"></div>
            <div className="w-8 h-28 bg-gray-600 rounded"></div>
        </div>
    </div>
);

export const ButtonSpinner = ({ size = 'sm' }) => (
    <div className={`animate-spin rounded-full border-2 border-white/30 border-t-white ${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}`}></div>
);

export default LoadingSpinner;

