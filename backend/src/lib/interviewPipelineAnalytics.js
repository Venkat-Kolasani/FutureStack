const { getRoundTypeLabel } = require('./roundLabels');

const roundToOneDecimal = (num) => Math.round(num * 10 + Number.EPSILON) / 10;

function groupRoundsByOpportunity(rounds) {
    const map = {};
    for (const round of rounds) {
        if (!map[round.opportunity_id]) {
            map[round.opportunity_id] = [];
        }
        map[round.opportunity_id].push(round);
    }
    return map;
}

function findRejectedRoundRecord(rounds, rejectedRoundNumber) {
    if (!rounds?.length || !rejectedRoundNumber) {
        return null;
    }

    return (
        rounds.find(
            (round) => round.round_number === rejectedRoundNumber && round.result === 'rejected'
        ) || rounds.find((round) => round.round_number === rejectedRoundNumber)
    );
}

function formatRejectionStage(roundNumber, roundType) {
    if (roundNumber && roundType) {
        return `Round ${roundNumber} · ${getRoundTypeLabel(roundType)}`;
    }
    if (roundNumber) {
        return `Round ${roundNumber}`;
    }
    return 'Stage not recorded';
}

function buildFunnelByRoundType(internships, roundsByOpportunity) {
    const statsByType = {};

    for (const opp of internships) {
        const oppRounds = roundsByOpportunity[opp.id] || [];

        for (const round of oppRounds) {
            const roundType = round.round_type;
            if (!statsByType[roundType]) {
                statsByType[roundType] = { reached: 0, cleared: 0, rejected: 0 };
            }
            statsByType[roundType].reached += 1;

            if (round.result === 'cleared') {
                statsByType[roundType].cleared += 1;
            } else if (round.result === 'rejected') {
                statsByType[roundType].rejected += 1;
            }
        }
    }

    return Object.entries(statsByType)
        .map(([roundType, counts]) => ({
            roundType,
            label: getRoundTypeLabel(roundType),
            reached: counts.reached,
            cleared: counts.cleared,
            rejected: counts.rejected,
            clearanceRate:
                counts.reached > 0
                    ? roundToOneDecimal((counts.cleared / counts.reached) * 100)
                    : null,
        }))
        .sort((a, b) => b.reached - a.reached);
}

function buildStageReachByRoundNumber(internships, roundsByOpportunity) {
    const statsByNumber = {};

    for (const opp of internships) {
        const oppRounds = roundsByOpportunity[opp.id] || [];
        for (const round of oppRounds) {
            const roundNumber = round.round_number;
            if (!statsByNumber[roundNumber]) {
                statsByNumber[roundNumber] = { reached: 0, stillActive: 0 };
            }
            statsByNumber[roundNumber].reached += 1;
            if (round.result === 'pending') {
                statsByNumber[roundNumber].stillActive += 1;
            }
        }
    }

    return Object.entries(statsByNumber)
        .map(([roundNumber, counts]) => ({
            roundNumber: Number(roundNumber),
            reached: counts.reached,
            stillActive: counts.stillActive,
        }))
        .sort((a, b) => a.roundNumber - b.roundNumber);
}

/**
 * Build internship interview-pipeline analytics for dashboards and reports.
 */
function buildInterviewPipelineAnalytics(opportunities, rounds = []) {
    const internships = opportunities.filter((opp) => opp.category === 'internship');
    const roundsByOpportunity = groupRoundsByOpportunity(rounds);

    const rejectionByRoundNumber = {};
    const rejectionByRoundType = {};
    const rejections = [];
    let roundsBeforeRejectionSum = 0;
    let rejectionWithRoundNumber = 0;

    for (const opp of internships) {
        if (opp.status !== 'rejected') {
            continue;
        }

        const oppRounds = roundsByOpportunity[opp.id] || [];
        const roundNumber = opp.rejected_round_number;
        const rejectedRound = findRejectedRoundRecord(oppRounds, roundNumber);
        const roundType = rejectedRound?.round_type || null;

        if (roundNumber) {
            rejectionByRoundNumber[roundNumber] = (rejectionByRoundNumber[roundNumber] || 0) + 1;
            rejectionWithRoundNumber += 1;
            roundsBeforeRejectionSum += roundNumber;
        }

        if (roundType) {
            rejectionByRoundType[roundType] = (rejectionByRoundType[roundType] || 0) + 1;
        }

        rejections.push({
            opportunityId: opp.id,
            title: opp.title,
            roundNumber,
            roundType,
            roundTypeLabel: formatRejectionStage(roundNumber, roundType),
            clearedRoundsBeforeRejection: roundNumber ? Math.max(roundNumber - 1, 0) : 0
        });
    }

    rejections.sort((a, b) => {
        if (a.roundNumber === b.roundNumber) {
            return a.title.localeCompare(b.title);
        }
        return (a.roundNumber || 999) - (b.roundNumber || 999);
    });

    const activeInPipeline = internships.filter((opp) =>
        ['applied', 'shortlisted', 'interviewed'].includes(opp.status)
    ).length;

    return {
        internshipCount: internships.length,
        trackedWithRounds: internships.filter((opp) => (roundsByOpportunity[opp.id]?.length || 0) > 0).length,
        activeInPipeline,
        rejectedCount: rejections.length,
        averageRoundsBeforeRejection:
            rejectionWithRoundNumber > 0
                ? roundToOneDecimal(roundsBeforeRejectionSum / rejectionWithRoundNumber)
                : null,
        rejectionByRoundNumber: Object.entries(rejectionByRoundNumber)
            .map(([roundNumber, count]) => ({
                roundNumber: Number(roundNumber),
                count
            }))
            .sort((a, b) => a.roundNumber - b.roundNumber),
        rejectionByRoundType: Object.entries(rejectionByRoundType)
            .map(([roundType, count]) => ({
                roundType,
                label: getRoundTypeLabel(roundType),
                count
            }))
            .sort((a, b) => b.count - a.count),
        funnelByRoundType: buildFunnelByRoundType(internships, roundsByOpportunity),
        stageReachByRoundNumber: buildStageReachByRoundNumber(internships, roundsByOpportunity),
        rejections
    };
}

module.exports = {
    buildInterviewPipelineAnalytics,
    buildFunnelByRoundType,
    buildStageReachByRoundNumber,
    groupRoundsByOpportunity,
    findRejectedRoundRecord,
    formatRejectionStage
};
