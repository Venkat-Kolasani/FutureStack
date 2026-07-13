import React from 'react';

const Card = ({
  children,
  className = '',
  hover = false,
  onClick,
  ...props
}) => {
  const baseStyles = 'bg-white dark:bg-[#0A0A0A] rounded-xl shadow-lg border border-gray-200 dark:border-white/10 transition-all duration-300';
  const hoverStyles = hover ? 'hover:shadow-blue-900/20 hover:border-blue-500/30 hover:-translate-y-1 cursor-pointer' : '';

  return (
    <div
      className={`${baseStyles} ${hoverStyles} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
