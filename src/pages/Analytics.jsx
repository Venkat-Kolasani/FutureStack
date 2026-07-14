import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    BarChart, Bar
} from 'recharts';
import { FaChartPie, FaChartLine, FaFilter, FaCalendarAlt, FaTrophy, FaLayerGroup } from 'react-icons/fa';
import SEO from '../components/seo/SEO';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { SkeletonChart } from '../components/common/LoadingSpinner';
import InterviewRejectionInsights from '../components/analytics/InterviewRejectionInsights';
import InterviewFunnelChart from '../components/analytics/InterviewFunnelChart';
import { analyticsService } from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Analytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const { isDark } = useTheme();

    const axisColor = isDark ? '#9CA3AF' : '#6B7280';
    const gridColor = isDark ? '#374151' : '#E5E7EB';

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const data = await analyticsService.getAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Color palette for charts
    const COLORS = {
        applied: '#3B82F6',      // Blue
        shortlisted: '#F59E0B',  // Amber
        interviewed: '#8B5CF6',  // Purple
        selected: '#10B981',     // Green
        rejected: '#EF4444',     // Red
        ghosted: '#94A3B8',      // Slate
    };

    const PIE_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#EF4444', '#94A3B8'];
    const CATEGORY_COLORS = { internship: '#6366F1', hackathon: '#EC4899' };
    const CAMPUS_MODE_COLORS = {
        on_campus: '#14B8A6',
        off_campus: '#F97316',
        unspecified: '#6B7280',
    };

    // Transform status data for pie chart
    const getStatusPieData = () => {
        if (!analytics?.statusCounts) return [];
        return Object.entries(analytics.statusCounts)
            .filter(([_, value]) => value > 0)
            .map(([key, value]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1),
                value,
                color: COLORS[key]
            }));
    };

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-xl">
                    <p className="text-gray-900 dark:text-white font-medium">{payload[0].name}</p>
                    <p className="text-gray-700 dark:text-gray-300">{payload[0].value} opportunities</p>
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for line chart
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 shadow-xl">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{label}</p>
                    <p className="text-gray-900 dark:text-white font-medium">{payload[0].value} applications</p>
                </div>
            );
        }
        return null;
    };

    // Loading state with skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800/50 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SkeletonChart />
                        <SkeletonChart />
                    </div>
                </div>
            </div>
        );
    }

    // Empty state when no data or total is 0
    if (!analytics || analytics.total === 0) {
        return (
            <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                            <FaChartPie className="text-purple-500" />
                            Analytics Dashboard
                        </h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                            Track your application progress and discover insights
                        </p>
                    </div>
                    <Card className="p-8">
                        <EmptyState variant="analytics" />
                    </Card>
                </div>
            </div>
        );
    }

    const statusPieData = getStatusPieData();

    return (
        <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6">
            <SEO
                title="Analytics"
                description="Visualize your application progress with charts and insights. Track success rates and identify trends."
                canonical="/analytics"
                noindex={true}
            />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                        <FaChartPie className="text-purple-500" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        Track your application progress and discover insights
                    </p>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-blue-500/20">
                                <FaFilter className="text-blue-400 text-xl" />
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Total Applied</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-green-500/20">
                                <FaTrophy className="text-green-400 text-xl" />
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Success Rate</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.metrics.conversionRate}%</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-purple-500/20">
                                <FaChartLine className="text-purple-400 text-xl" />
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">In Progress</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.metrics.inProgress}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 sm:p-6 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/20">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-amber-500/20">
                                <FaCalendarAlt className="text-amber-400 text-xl" />
                            </div>
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Selected</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.statusCounts.selected}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Status Distribution Pie Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FaChartPie className="text-purple-400" />
                            Status Distribution
                        </h3>
                        {statusPieData.length > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                            animationBegin={0}
                                            animationDuration={800}
                                        >
                                            {statusPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend
                                            wrapperStyle={{ color: '#9CA3AF' }}
                                            formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-72 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                No data to display
                            </div>
                        )}
                    </Card>

                    {/* Weekly Trend Line Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <FaChartLine className="text-blue-400" />
                            Weekly Application Trend
                        </h3>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics.weeklyBreakdown}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                                    <XAxis
                                        dataKey="week"
                                        stroke={axisColor}
                                        tick={{ fill: axisColor }}
                                    />
                                    <YAxis
                                        stroke={axisColor}
                                        tick={{ fill: axisColor }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomLineTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: '#A78BFA' }}
                                        animationDuration={1000}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Conversion Funnel, Category & Campus Mode */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                    {/* Conversion Funnel */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion Funnel</h3>
                        <div className="space-y-4">
                            {analytics.funnelData?.map((stage, index) => (
                                <div key={stage.stage} className="relative">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{stage.stage}</span>
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">{stage.count} ({stage.percentage}%)</span>
                                    </div>
                                    <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full rounded-lg transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${stage.percentage}%`,
                                                background: `linear-gradient(90deg, ${PIE_COLORS[index]} 0%, ${PIE_COLORS[index]}88 100%)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Category Breakdown */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={[
                                        { name: 'Internships', value: analytics.categoryCounts.internship, fill: CATEGORY_COLORS.internship },
                                        { name: 'Hackathons', value: analytics.categoryCounts.hackathon, fill: CATEGORY_COLORS.hackathon },
                                    ]}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                    <XAxis type="number" stroke={axisColor} tick={{ fill: axisColor }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} width={100} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-xl px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10">
                                                        <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.name}</p>
                                                        <p className="text-gray-700 dark:text-gray-300">{payload[0].value} opportunities</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={800}>
                                        {[
                                            { name: 'Internships', fill: CATEGORY_COLORS.internship },
                                            { name: 'Hackathons', fill: CATEGORY_COLORS.hackathon },
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex justify-center gap-8">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.internship }}></div>
                                <span className="text-gray-700 dark:text-gray-300 text-sm">Internships</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.hackathon }}></div>
                                <span className="text-gray-700 dark:text-gray-300 text-sm">Hackathons</span>
                            </div>
                        </div>
                    </Card>

                    {/* Campus Mode Breakdown */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Campus Mode Breakdown</h3>
                        {analytics.campusModeCounts ? (
                            <>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: 'On-campus', value: analytics.campusModeCounts.on_campus, fill: CAMPUS_MODE_COLORS.on_campus },
                                                { name: 'Off-campus', value: analytics.campusModeCounts.off_campus, fill: CAMPUS_MODE_COLORS.off_campus },
                                                { name: 'Not specified', value: analytics.campusModeCounts.unspecified, fill: CAMPUS_MODE_COLORS.unspecified },
                                            ]}
                                            layout="vertical"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                                            <XAxis type="number" stroke={axisColor} tick={{ fill: axisColor }} allowDecimals={false} />
                                            <YAxis type="category" dataKey="name" stroke={axisColor} tick={{ fill: axisColor }} width={100} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10">
                                                                <p className="text-gray-900 dark:text-white font-medium">{payload[0].payload.name}</p>
                                                                <p className="text-gray-700 dark:text-gray-300">{payload[0].value} opportunities</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={800}>
                                                {[
                                                    { fill: CAMPUS_MODE_COLORS.on_campus },
                                                    { fill: CAMPUS_MODE_COLORS.off_campus },
                                                    { fill: CAMPUS_MODE_COLORS.unspecified },
                                                ].map((entry, index) => (
                                                    <Cell key={`campus-cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex flex-wrap justify-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CAMPUS_MODE_COLORS.on_campus }}></div>
                                        <span className="text-gray-700 dark:text-gray-300 text-sm">On-campus</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CAMPUS_MODE_COLORS.off_campus }}></div>
                                        <span className="text-gray-700 dark:text-gray-300 text-sm">Off-campus</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CAMPUS_MODE_COLORS.unspecified }}></div>
                                        <span className="text-gray-700 dark:text-gray-300 text-sm">Not specified</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                No campus data to display
                            </div>
                        )}
                    </Card>
                </div>

                {/* Deadline Heatmap */}
                <Card className="p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FaCalendarAlt className="text-amber-400" />
                        Deadline Heatmap (Next 30 Days)
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-gray-500 text-xs font-medium py-1">
                                {day}
                            </div>
                        ))}
                        {analytics.deadlineDistribution?.map((item, index) => {
                            // Pad the first row if needed
                            const paddingCells = index === 0 ? item.dayOfWeek : 0;
                            const cells = [];

                            if (paddingCells > 0 && index === 0) {
                                for (let i = 0; i < paddingCells; i++) {
                                    cells.push(
                                        <div key={`pad-${i}`} className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-900/30"></div>
                                    );
                                }
                            }

                            const intensity = item.count === 0 ? 0 : Math.min(item.count, 3);
                            const bgColor = intensity === 0
                                ? 'bg-gray-100 dark:bg-gray-800/50'
                                : intensity === 1
                                    ? 'bg-amber-500/30'
                                    : intensity === 2
                                        ? 'bg-amber-500/60'
                                        : 'bg-amber-500';

                            cells.push(
                                <div
                                    key={item.date}
                                    className={`aspect-square rounded-lg ${bgColor} flex items-center justify-center transition-all hover:scale-105 cursor-pointer group relative`}
                                    title={`${item.date}: ${item.count} deadline${item.count !== 1 ? 's' : ''}`}
                                >
                                    <span className="text-xs text-gray-700 dark:text-gray-300">{item.day}</span>
                                    {item.count > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-xs text-gray-900 dark:text-white flex items-center justify-center font-bold">
                                            {item.count}
                                        </span>
                                    )}
                                </div>
                            );

                            return cells;
                        })}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800/50"></div>
                            <div className="w-4 h-4 rounded bg-amber-500/30"></div>
                            <div className="w-4 h-4 rounded bg-amber-500/60"></div>
                            <div className="w-4 h-4 rounded bg-amber-500"></div>
                        </div>
                        <span>More</span>
                    </div>
                </Card>

                {/* Interview pipeline — where rejections happen */}
                <div className="mb-8">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FaLayerGroup className="text-red-400" />
                            Interview pipeline insights
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            See which round and stage type you were rejected at across internships
                        </p>
                    </div>
                    <InterviewRejectionInsights pipeline={analytics.pipelineAnalytics} />
                    <div className="mt-6">
                        <InterviewFunnelChart pipeline={analytics.pipelineAnalytics} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
