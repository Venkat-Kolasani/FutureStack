import React from 'react';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 flex items-center justify-center';

  const variants = {
    primary: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-lg shadow-blue-900/10 hover:shadow-blue-900/30 focus:ring-blue-500',
    secondary: 'bg-white/10 text-gray-900 dark:text-white hover:bg-white/20 border border-gray-200 dark:border-white/10 hover:border-white/20 focus:ring-gray-500 backdrop-blur-sm',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500 hover:text-white hover:border-green-500 shadow-lg shadow-green-900/10 focus:ring-green-500',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-lg shadow-red-900/10 focus:ring-red-500',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 shadow-lg shadow-yellow-900/10 focus:ring-yellow-500',
    outline: 'bg-transparent border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 focus:ring-blue-500',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
