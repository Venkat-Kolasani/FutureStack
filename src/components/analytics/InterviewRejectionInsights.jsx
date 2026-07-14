import React from 'react';
import { FaExclamationTriangle, FaLayerGroup } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Card from '../common/Card';

const REJECTION_BAR_COLOR = '#EF4444';

/**
 * Interview rejection breakdown — shared by Analytics and Reports.
 * @param {boolean} showMetrics - Top metric cards (Analytics page)
 * @param {boolean} showCharts - Bar charts (hide on Reports if only log needed)
 */
const InterviewRejectionInsights = ({
  pipeline,
  compact = false,
  showMetrics = true,
  showCharts = true,
}) => {
  if (!pipeline || pipeline.rejectedCount === 0) {
    return (
      <Card className={compact ? 'p-4' : 'p-6'}>
        <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          <FaLayerGroup className="text-red-400" />
          Where you were rejected
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No rejected internships with pipeline data yet. Mark a round as rejected on an internship to see
          where you tend to drop off.
        </p>
      </Card>
    );
  }

  const byRoundChart = pipeline.rejectionByRoundNumber.map((item) => ({
    name: `R${item.roundNumber}`,
    label: `Round ${item.roundNumber}`,
    count: item.count
  }));

  const byTypeChart = pipeline.rejectionByRoundType.map((item) => ({
    name: item.label,
    count: item.count
  }));

  const chartHeight = compact ? 'h-40' : 'h-56';

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {showMetrics && !compact && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">Rejected internships</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-300">{pipeline.rejectedCount}</p>
          </Card>
          <Card className="p-4 bg-purple-500/10 border-purple-500/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">Avg round reached</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-200">
              {pipeline.averageRoundsBeforeRejection ?? '—'}
            </p>
          </Card>
          <Card className="p-4 bg-blue-500/10 border-blue-500/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">Active in pipeline</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-200">{pipeline.activeInPipeline}</p>
          </Card>
          <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">With rounds logged</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-200">{pipeline.trackedWithRounds}</p>
          </Card>
        </div>
      )}

      {showCharts && (
      <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-6`}>
        {byRoundChart.length > 0 && (
          <Card className="p-6">
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-4 ${compact ? 'text-base' : 'text-lg'}`}>
              Rejections by round number
            </h3>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRoundChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-xl">
                          <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.label}</p>
                          <p className="text-gray-700 dark:text-gray-300">{payload[0].value} rejection(s)</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {byRoundChart.map((entry) => (
                      <Cell key={entry.name} fill={REJECTION_BAR_COLOR} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {byTypeChart.length > 0 && (
          <Card className="p-6">
            <h3 className={`font-semibold text-gray-900 dark:text-white mb-4 ${compact ? 'text-base' : 'text-lg'}`}>
              Rejections by stage type
            </h3>
            <div className={chartHeight}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTypeChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-xl">
                          <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.name}</p>
                          <p className="text-gray-700 dark:text-gray-300">{payload[0].value} rejection(s)</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill={REJECTION_BAR_COLOR} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
      )}

      <Card className={compact ? 'p-4' : 'p-6'}>
        <h3 className={`font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          <FaExclamationTriangle className="text-red-400" />
          Rejection log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                <th className="pb-3 pr-4 font-medium">Internship</th>
                <th className="pb-3 pr-4 font-medium">Stopped at</th>
                <th className="pb-3 font-medium hidden sm:table-cell">Cleared before</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.rejections.map((item) => (
                <tr key={item.opportunityId} className="border-b border-gray-200 dark:border-white/10 last:border-0">
                  <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">{item.title}</td>
                  <td className="py-3 pr-4 text-red-600 dark:text-red-300">{item.roundTypeLabel}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {item.clearedRoundsBeforeRejection} round
                    {item.clearedRoundsBeforeRejection !== 1 ? 's' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default InterviewRejectionInsights;
