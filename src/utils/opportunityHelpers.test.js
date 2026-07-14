import {
    supportsDocuments,
    DOCUMENT_SUPPORTED_CATEGORIES,
    getDocumentUnavailableMessage,
    isActiveInternshipStatus,
    INACTIVE_INTERNSHIP_STATUSES,
    getCampusModeLabel,
    calculateCampusModeStats,
    filterByCampusMode,
} from './opportunityHelpers';

describe('opportunityHelpers', () => {
    describe('supportsDocuments', () => {
        it('returns true for internship category', () => {
            expect(supportsDocuments('internship')).toBe(true);
        });

        it('returns false for hackathon category', () => {
            expect(supportsDocuments('hackathon')).toBe(false);
        });
    });

    describe('DOCUMENT_SUPPORTED_CATEGORIES', () => {
        it('includes internship only', () => {
            expect(DOCUMENT_SUPPORTED_CATEGORIES).toEqual(['internship']);
        });
    });

    describe('getDocumentUnavailableMessage', () => {
        it('returns null when documents are supported', () => {
            expect(getDocumentUnavailableMessage('internship')).toBeNull();
        });

        it('returns explanation when documents are not supported', () => {
            expect(getDocumentUnavailableMessage('hackathon')).toMatch(/internship/i);
        });
    });

    describe('isActiveInternshipStatus', () => {
        it('treats applied and interviewed as active', () => {
            expect(isActiveInternshipStatus('applied')).toBe(true);
            expect(isActiveInternshipStatus('interviewed')).toBe(true);
            expect(isActiveInternshipStatus('shortlisted')).toBe(true);
        });

        it('treats rejected, selected, and ghosted as inactive', () => {
            INACTIVE_INTERNSHIP_STATUSES.forEach((status) => {
                expect(isActiveInternshipStatus(status)).toBe(false);
            });
        });
    });

    describe('getCampusModeLabel', () => {
        it('returns labels for known campus modes', () => {
            expect(getCampusModeLabel('on_campus')).toBe('On-Campus');
            expect(getCampusModeLabel('off_campus')).toBe('Off-Campus');
        });

        it('returns null for unset campus mode', () => {
            expect(getCampusModeLabel(null)).toBeNull();
            expect(getCampusModeLabel(undefined)).toBeNull();
        });
    });

    describe('calculateCampusModeStats', () => {
        it('counts campus modes in a list', () => {
            expect(
                calculateCampusModeStats([
                    { campus_mode: 'on_campus' },
                    { campus_mode: 'off_campus' },
                    { campus_mode: null },
                ])
            ).toEqual({
                on_campus: 1,
                off_campus: 1,
                unspecified: 1,
            });
        });
    });

    describe('filterByCampusMode', () => {
        const opportunities = [
            { campus_mode: 'on_campus' },
            { campus_mode: 'off_campus' },
            { campus_mode: null },
        ];

        it('returns all opportunities when filter is all', () => {
            expect(filterByCampusMode(opportunities, 'all')).toHaveLength(3);
        });

        it('filters by on_campus or off_campus', () => {
            expect(filterByCampusMode(opportunities, 'on_campus')).toEqual([
                { campus_mode: 'on_campus' },
            ]);
            expect(filterByCampusMode(opportunities, 'off_campus')).toEqual([
                { campus_mode: 'off_campus' },
            ]);
        });
    });
});
