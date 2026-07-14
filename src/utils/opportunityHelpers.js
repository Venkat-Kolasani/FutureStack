/**
 * Opportunity helper utilities
 * Centralizes business rules related to opportunities
 */

/**
 * Checks if an opportunity category supports document attachments
 * Currently only 'internship' opportunities support document attachments
 * 
 * @param {string} category - The opportunity category (e.g., 'internship', 'hackathon')
 * @returns {boolean} - True if documents can be attached to this category
 */
export const supportsDocuments = (category) => {
    return category === 'internship';
};

/**
 * List of opportunity categories that support document attachments
 * Useful for UI messaging and validation
 */
export const DOCUMENT_SUPPORTED_CATEGORIES = ['internship'];

/** Internship statuses no longer in the active pipeline (hidden by default on Internships page). */
export const INACTIVE_INTERNSHIP_STATUSES = ['rejected', 'selected', 'ghosted'];

export const isActiveInternshipStatus = (status) =>
  !INACTIVE_INTERNSHIP_STATUSES.includes(status);

/**
 * Get a user-friendly message explaining why documents are not available
 * @param {string} category - The opportunity category
 * @returns {string|null} - Message explaining why documents aren't supported, or null if they are
 */
export const getDocumentUnavailableMessage = (category) => {
    if (supportsDocuments(category)) {
        return null;
    }
    return 'Document attachments are only available for internship opportunities.';
};

/** Human-readable labels for campus_mode values. */
export const getCampusModeLabel = (mode) => {
    if (mode === 'on_campus') return 'On-Campus';
    if (mode === 'off_campus') return 'Off-Campus';
    return null;
};

export const CAMPUS_MODE_BADGE_STYLES = {
    on_campus: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    off_campus: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
};

export const CAMPUS_MODE_FILTER_OPTIONS = [
    { value: 'all', label: 'All Campus Types' },
    { value: 'on_campus', label: 'On-Campus' },
    { value: 'off_campus', label: 'Off-Campus' },
];

export const CAMPUS_MODE_FORM_OPTIONS = [
    { value: '', label: 'Not specified' },
    { value: 'on_campus', label: 'On-Campus' },
    { value: 'off_campus', label: 'Off-Campus' },
];

/**
 * Count campus_mode values for a list of opportunities.
 * @param {Array} opportunities
 * @returns {{ on_campus: number, off_campus: number, unspecified: number }}
 */
export const calculateCampusModeStats = (opportunities = []) => {
    const stats = { on_campus: 0, off_campus: 0, unspecified: 0 };
    opportunities.forEach((opp) => {
        if (opp.campus_mode === 'on_campus') {
            stats.on_campus++;
        } else if (opp.campus_mode === 'off_campus') {
            stats.off_campus++;
        } else {
            stats.unspecified++;
        }
    });
    return stats;
};

/** Filter opportunities by campus_mode when filter is not 'all'. */
export const filterByCampusMode = (opportunities, campusModeFilter) => {
    if (campusModeFilter === 'all') {
        return opportunities;
    }
    return opportunities.filter((opp) => opp.campus_mode === campusModeFilter);
};
