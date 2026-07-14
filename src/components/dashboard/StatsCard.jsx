import Card from '../common/Card';

const StatsCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    orange: 'bg-orange-500/20 text-orange-400',
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
    gray: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  };

  return (
    <Card hover className="p-4 sm:p-6 group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors">{value}</p>
        </div>
        {Icon && (
          <div className={`p-2 sm:p-3 rounded-full transition-all duration-200 group-hover:scale-110 ${colorClasses[color] || colorClasses.blue}`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatsCard;
