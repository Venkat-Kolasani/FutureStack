const { deriveOpportunityFieldsFromRounds } = require('../../src/lib/syncOpportunityFromRounds');

describe('deriveOpportunityFieldsFromRounds', () => {
    it('returns applied with null round pointers when there are no rounds', () => {
        expect(deriveOpportunityFieldsFromRounds([], 'interviewed')).toEqual({
            status: 'applied',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it('keeps applied when resume shortlisted is only pending', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'pending' }
            ])
        ).toEqual({
            status: 'applied',
            current_round_number: 1,
            rejected_round_number: null
        });
    });

    it('marks shortlisted when resume shortlisted is cleared', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'cleared' }
            ])
        ).toEqual({
            status: 'shortlisted',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it('marks shortlisted when an OA is cleared', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'oa', result: 'cleared' }
            ])
        ).toEqual({
            status: 'shortlisted',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it('stays shortlisted when resume is cleared and technical is pending', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'cleared' },
                { round_number: 2, round_type: 'technical', result: 'pending' }
            ])
        ).toEqual({
            status: 'shortlisted',
            current_round_number: 2,
            rejected_round_number: null
        });
    });

    it('stays shortlisted when multiple screening rounds are cleared', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'cleared' },
                { round_number: 2, round_type: 'oa', result: 'cleared' }
            ])
        ).toEqual({
            status: 'shortlisted',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it('marks interviewed when a technical round is cleared', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'cleared' },
                { round_number: 2, round_type: 'technical', result: 'cleared' }
            ])
        ).toEqual({
            status: 'interviewed',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it.each(['technical', 'hr', 'group_discussion', 'managerial'])(
        'marks interviewed when a %s round is cleared',
        (roundType) => {
            expect(
                deriveOpportunityFieldsFromRounds([
                    { round_number: 1, round_type: roundType, result: 'cleared' }
                ])
            ).toEqual({
                status: 'interviewed',
                current_round_number: null,
                rejected_round_number: null
            });
        }
    );

    it('returns to shortlisted when the technical round is reverted to pending', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'cleared' },
                { round_number: 2, round_type: 'technical', result: 'pending' }
            ])
        ).toEqual({
            status: 'shortlisted',
            current_round_number: 2,
            rejected_round_number: null
        });
    });

    it('returns to applied when the only interview round is deleted', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'technical', result: 'pending' }
            ])
        ).toEqual({
            status: 'applied',
            current_round_number: 1,
            rejected_round_number: null
        });
    });

    it('does not promote skipped or other rounds', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'other', result: 'cleared' },
                { round_number: 2, round_type: 'oa', result: 'skipped' }
            ])
        ).toEqual({
            status: 'applied',
            current_round_number: null,
            rejected_round_number: null
        });
    });

    it('marks rejected at round 1', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'resume_shortlisted', result: 'rejected' }
            ])
        ).toEqual({
            status: 'rejected',
            current_round_number: null,
            rejected_round_number: 1
        });
    });

    it('marks rejected at the failing round', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'oa', result: 'cleared' },
                { round_number: 2, round_type: 'technical', result: 'rejected' }
            ])
        ).toEqual({
            status: 'rejected',
            current_round_number: null,
            rejected_round_number: 2
        });
    });

    it('marks selected when final round is cleared', () => {
        expect(
            deriveOpportunityFieldsFromRounds([
                { round_number: 1, round_type: 'technical', result: 'cleared' },
                { round_number: 2, round_type: 'final', result: 'cleared' }
            ])
        ).toEqual({
            status: 'selected',
            current_round_number: null,
            rejected_round_number: null
        });
    });
});
