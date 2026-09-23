/**
 * Derive opportunity pipeline fields from interview rounds.
 * Screening rounds (resume, OA, assignments) promote to shortlisted.
 * Interview rounds (technical, HR, GD, managerial) promote to interviewed.
 * Pending rounds never promote status; they only set current_round_number.
 *
 * @param {Array<{ round_number: number, round_type: string, result: string }>} rounds
 * @param {string} [_existingStatus] Unused; status is always derived from rounds.
 * @returns {{ status: string, current_round_number: number | null, rejected_round_number: number | null }}
 */

const SCREENING_ROUND_TYPES = new Set([
    'resume_shortlisted',
    'oa',
    'assignment',
    'technical_assignment'
]);

const INTERVIEW_ROUND_TYPES = new Set([
    'technical',
    'hr',
    'group_discussion',
    'managerial'
]);

function deriveOpportunityFieldsFromRounds(rounds, _existingStatus = 'applied') {
    const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number);

    const rejectedRound = sorted.find((round) => round.result === 'rejected');
    if (rejectedRound) {
        return {
            status: 'rejected',
            current_round_number: null,
            rejected_round_number: rejectedRound.round_number
        };
    }

    const pendingRound = sorted.find((round) => round.result === 'pending');
    const current_round_number = pendingRound ? pendingRound.round_number : null;

    const clearedTypes = new Set(
        sorted.filter((round) => round.result === 'cleared').map((round) => round.round_type)
    );

    let status = 'applied';
    if (clearedTypes.has('final')) {
        status = 'selected';
    } else if ([...clearedTypes].some((type) => INTERVIEW_ROUND_TYPES.has(type))) {
        status = 'interviewed';
    } else if ([...clearedTypes].some((type) => SCREENING_ROUND_TYPES.has(type))) {
        status = 'shortlisted';
    }

    return {
        status,
        current_round_number,
        rejected_round_number: null
    };
}

/**
 * Load rounds for an opportunity and patch derived fields on opportunities row.
 * Pass `existingStatus` and/or `rounds` to skip redundant reads when the caller already has them.
 */
async function syncOpportunityFromRounds(supabase, opportunityId, userId, options = {}) {
    let existingStatus = options.existingStatus;
    let rounds = options.rounds;

    if (existingStatus === undefined) {
        const { data: opportunity, error: oppError } = await supabase
            .from('opportunities')
            .select('id, status')
            .eq('id', opportunityId)
            .eq('user_id', userId)
            .single();

        if (oppError) {
            throw oppError;
        }

        existingStatus = opportunity.status;
    }

    if (rounds === undefined) {
        const { data: roundsData, error: roundsError } = await supabase
            .from('opportunity_rounds')
            .select('round_number, round_type, result')
            .eq('opportunity_id', opportunityId)
            .eq('user_id', userId)
            .order('round_number', { ascending: true });

        if (roundsError) {
            throw roundsError;
        }

        rounds = roundsData;
    }

    const derived = deriveOpportunityFieldsFromRounds(rounds || [], existingStatus);
    const patch = {
        current_round_number: derived.current_round_number,
        rejected_round_number: derived.rejected_round_number
    };

    if (derived.status !== undefined) {
        patch.status = derived.status;
    }

    const { data: updated, error: updateError } = await supabase
        .from('opportunities')
        .update(patch)
        .eq('id', opportunityId)
        .eq('user_id', userId)
        .select()
        .single();

    if (updateError) {
        throw updateError;
    }

    return updated;
}

module.exports = {
    deriveOpportunityFieldsFromRounds,
    syncOpportunityFromRounds
};
