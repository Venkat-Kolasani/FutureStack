const HEATMAP_DAY_COUNT = 365;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarIsoDate(isoDateStr) {
    if (typeof isoDateStr !== 'string' || !ISO_DATE.test(isoDateStr)) {
        return false;
    }

    const [year, month, day] = isoDateStr.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
        parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day
    );
}

function shiftIsoDate(isoDate, days) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day + days));
    return shifted.toISOString().slice(0, 10);
}

function utcTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function resolveHeatmapEndDate(endDate) {
    if (typeof endDate === 'string' && isValidCalendarIsoDate(endDate)) {
        return endDate;
    }
    return utcTodayIsoDate();
}

/**
 * Build a dense 365-day heatmap series ending on `endDate`.
 * Counts only rows with did_log = true. Calendar math uses UTC date parts
 * so YYYY-MM-DD values are not shifted by the server timezone.
 */
function fillHeatmapDays(rows = [], endDate, dayCount = HEATMAP_DAY_COUNT) {
    const resolvedEnd = resolveHeatmapEndDate(endDate);
    const counts = new Map();
    const tracksByDate = new Map();

    rows.forEach((row) => {
        if (!row || row.did_log === false) return;
        const date = row.log_date;
        if (!date || !ISO_DATE.test(date)) return;

        counts.set(date, (counts.get(date) || 0) + 1);
        const trackName = row.track_name;
        if (trackName) {
            const names = tracksByDate.get(date) || [];
            if (!names.includes(trackName)) names.push(trackName);
            tracksByDate.set(date, names);
        }
    });

    const startDate = shiftIsoDate(resolvedEnd, -(dayCount - 1));
    const days = [];
    for (let offset = 0; offset < dayCount; offset += 1) {
        const date = shiftIsoDate(startDate, offset);
        days.push({
            date,
            count: counts.get(date) || 0,
            tracks: tracksByDate.get(date) || [],
        });
    }

    return days;
}

module.exports = {
    HEATMAP_DAY_COUNT,
    fillHeatmapDays,
    isValidCalendarIsoDate,
    resolveHeatmapEndDate,
    shiftIsoDate,
};
