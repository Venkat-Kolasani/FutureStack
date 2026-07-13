import React from 'react';
import { FaFilter } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import Card from '../common/Card';

const FUNNEL_COLORS = {
  reached: '#6366F1',
  cleared: '#22C55E',
  rejected: '#EF4444',
};

/**
 * Pipeline funnel by round type — reach vs clear vs reject.
 */
const InterviewFunnelChart = ({ pipeline, compact = false }) => {
  const funnel = pipeline?.funnelByRoundType || [];

  if (!funnel.length) {
    return (
      <Card className={compact ? 'p-4' : 'p-6'}>
        <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          <FaFilter className="text-indigo-400" />
          Pipeline funnel by round type
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Log interview rounds on internships to see how far you progress through each stage type.
        </p>
      </Card>
    );
  }

  const chartData = funnel.map((item) => ({
    name: item.label.length > 14 ? `${item.label.slice(0, 12)}…` : item.label,
    fullName: item.label,
    reached: item.reached,
    cleared: item.cleared,
    rejected: item.rejected,
    clearanceRate: item.clearanceRate,
  }));

  const chartHeight = compact ? 'h-48' : 'h-64';

  return (
    <Card className={compact ? 'p-4' : 'p-6'}>
      <h3 className={`font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
        <FaFilter className="text-indigo-400" />
        Pipeline funnel by round type
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        How many internships reached each stage, and how many cleared vs were rejected there.
      </p>

      <div className={chartHeight}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }

                const data = payload[0].payload;

                return (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 shadow-xl p-3 text-sm text-gray-700 dark:text-gray-200">
                    <p className="mb-2 font-medium text-gray-900 dark:text-white">{data.fullName}</p>
                    <p>Reached: {data.reached}</p>
                    <p>Cleared: {data.cleared}</p>
                    <p>Rejected: {data.rejected}</p>
                    {data.clearanceRate != null && (
                      <p className="mt-1 text-gray-600 dark:text-gray-400">Clearance rate: {data.clearanceRate}%</p>
                    )}
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="reached" name="Reached" fill={FUNNEL_COLORS.reached} radius={[4, 4, 0, 0]} />
            <Bar dataKey="cleared" name="Cleared" fill={FUNNEL_COLORS.cleared} radius={[4, 4, 0, 0]} />
            <Bar dataKey="rejected" name="Rejected" fill={FUNNEL_COLORS.rejected} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!compact && pipeline.stageReachByRoundNumber?.length > 0 && (
        <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">By round number</p>
          <div className="flex flex-wrap gap-2">
            {pipeline.stageReachByRoundNumber.map((stage) => (
              <span
                key={stage.roundNumber}
                className="rounded-full border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-1 text-xs text-gray-700 dark:text-gray-300"
              >
                R{stage.roundNumber}: {stage.reached} reached
                {stage.stillActive > 0 ? ` · ${stage.stillActive} pending` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default InterviewFunnelChart;
