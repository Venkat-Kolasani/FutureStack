const express = require('express');
const { supabase } = require('../lib/supabase');
const { buildInterviewPipelineAnalytics } = require('../lib/interviewPipelineAnalytics');

const router = express.Router();

// Helper to avoid toFixed + parseFloat conversions
const roundToOneDecimal = (num) => Math.round(num * 10) / 10;

const toLocalDateKey = (value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * GET /api/analytics
 * Get analytics data for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.auth.internalUserId;

        // Only hackathon deadlines are active events. Internship timing is
        // modeled through scheduled interview rounds.
        const { data: opportunities, error } = await supabase
            .from('opportunities')
            .select('id, title, status, category, campus_mode, created_at, deadline, rejected_round_number, current_round_number')
            .eq('user_id', userId);

        if (error) throw error;

        const internshipIds = opportunities
            .filter((opp) => opp.category === 'internship')
            .map((opp) => opp.id);

        let rounds = [];
        if (internshipIds.length > 0) {
            const { data: roundsData, error: roundsError } = await supabase
                .from('opportunity_rounds')
                .select('opportunity_id, round_number, round_type, result')
                .eq('user_id', userId)
                .in('opportunity_id', internshipIds);

            if (roundsError) throw roundsError;
            rounds = roundsData || [];
        }

        const pipelineAnalytics = buildInterviewPipelineAnalytics(opportunities, rounds);

        // Calculate status counts
        const statusCounts = {
            applied: 0,
            interviewed: 0,
            shortlisted: 0,
            selected: 0,
            rejected: 0,
            ghosted: 0
        };

        // Calculate category counts
        const categoryCounts = {
            internship: 0,
            hackathon: 0
        };

        const campusModeCounts = {
            on_campus: 0,
            off_campus: 0,
            unspecified: 0
        };

        opportunities.forEach(opp => {
            if (opp.status && statusCounts.hasOwnProperty(opp.status)) {
                statusCounts[opp.status]++;
            }
            if (opp.category && categoryCounts.hasOwnProperty(opp.category)) {
                categoryCounts[opp.category]++;
            }
            if (opp.campus_mode === 'on_campus') {
                campusModeCounts.on_campus++;
            } else if (opp.campus_mode === 'off_campus') {
                campusModeCounts.off_campus++;
            } else {
                campusModeCounts.unspecified++;
            }
        });

        // Calculate conversion rates
        const totalApplied = opportunities.length;
        const totalSelected = statusCounts.selected;
        const totalRejected = statusCounts.rejected;
        const totalInProgress = statusCounts.applied + statusCounts.interviewed + statusCounts.shortlisted;

        const conversionRate = totalApplied > 0
            ? roundToOneDecimal((totalSelected / totalApplied) * 100)
            : 0;

        const rejectionRate = totalApplied > 0
            ? roundToOneDecimal((totalRejected / totalApplied) * 100)
            : 0;

        // Weekly breakdown (last 8 weeks)
        const now = new Date();
        const weeklyData = [];
        for (let i = 7; i >= 0; i--) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weekOpps = opportunities.filter(opp => {
                const created = new Date(opp.created_at);
                return created >= weekStart && created <= weekEnd;
            });

            weeklyData.push({
                week: `W${8 - i}`,
                weekStart: weekStart.toISOString().split('T')[0],
                count: weekOpps.length
            });
        }

        // Monthly breakdown (last 6 months) - keep for backward compatibility
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthOpps = opportunities.filter(opp => {
                const created = new Date(opp.created_at);
                return created >= monthStart && created <= monthEnd;
            });

            monthlyData.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                count: monthOpps.length
            });
        }

        // Deadline distribution (next 30 days heatmap data)
        const deadlineDistribution = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            date.setHours(0, 0, 0, 0);

            const dateStr = toLocalDateKey(date);
            const count = opportunities.filter(opp => {
                if (opp.category !== 'hackathon' || !opp.deadline) return false;
                return toLocalDateKey(opp.deadline) === dateStr;
            }).length;

            deadlineDistribution.push({
                date: dateStr,
                day: date.getDate(),
                dayOfWeek: date.getDay(),
                count
            });
        }

        // Funnel data for conversion visualization
        const funnelData = [
            { stage: 'Applied', count: totalApplied, percentage: 100 },
            { stage: 'Shortlisted', count: statusCounts.shortlisted + statusCounts.interviewed + totalSelected, percentage: totalApplied > 0 ? roundToOneDecimal(((statusCounts.shortlisted + statusCounts.interviewed + totalSelected) / totalApplied) * 100) : 0 },
            { stage: 'Interviewed', count: statusCounts.interviewed + totalSelected, percentage: totalApplied > 0 ? roundToOneDecimal(((statusCounts.interviewed + totalSelected) / totalApplied) * 100) : 0 },
            { stage: 'Selected', count: totalSelected, percentage: totalApplied > 0 ? roundToOneDecimal((totalSelected / totalApplied) * 100) : 0 }
        ];

        res.json({
            total: totalApplied,
            statusCounts,
            categoryCounts,
            campusModeCounts,
            metrics: {
                conversionRate: conversionRate,
                rejectionRate: rejectionRate,
                inProgress: totalInProgress,
                successRate: (totalSelected + totalRejected) > 0
                    ? roundToOneDecimal((totalSelected / (totalSelected + totalRejected)) * 100)
                    : 0
            },
            weeklyBreakdown: weeklyData,
            monthlyBreakdown: monthlyData,
            deadlineDistribution,
            funnelData,
            pipelineAnalytics
        });
    } catch (error) {
        console.error('Error fetching analytics:', error.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
