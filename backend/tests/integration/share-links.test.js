const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');
const {
    createPasscodeHash,
    encryptShareToken,
    hashToken,
} = require('../../src/lib/shareLinks');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
        rpc: (...args) => mockRpc(...args),
    },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };
const VALID_TOKEN = 'valid-token_123456789012345678901234';
const OPPORTUNITY_ID = '00000000-0000-4000-8000-000000000001';

const sampleSnapshot = {
    version: 2,
    generatedAt: '2026-06-24T12:00:00.000Z',
    shareType: 'placement_dashboard',
    options: {
        fields: {
            status: true,
            rounds: true,
            dateApplied: true,
            description: true,
            deadline: true,
            applicationLink: true,
        },
        expiry: '7d',
        selectionMode: 'all',
    },
    summary: {
        total: 1,
        statusCounts: { rejected: 1 },
        categoryCounts: { internship: 1 },
        selected: 0,
        rejected: 1,
        ghosted: 0,
        inProgress: 0,
        opportunitiesWithLinks: 1,
        upcomingDeadlineCount: 1,
        expiredDeadlineCount: 0,
    },
    opportunities: [
        {
            id: OPPORTUNITY_ID,
            title: 'Backend Intern',
            category: 'internship',
            status: 'rejected',
            description: 'Work on APIs and infrastructure.',
            deadline: '2026-07-01',
            applicationLink: 'https://example.com/apply',
            rejectedRoundNumber: 2,
            currentRoundNumber: 2,
            dateApplied: '2026-06-01T00:00:00.000Z',
        },
    ],
};

function shareRow(overrides = {}) {
    const encryptedToken = encryptShareToken(VALID_TOKEN);
    return {
        id: '00000000-0000-4000-8000-000000000099',
        user_id: TEST_AUTH.internalUserId,
        token_hash: hashToken(VALID_TOKEN),
        token_ciphertext: encryptedToken.tokenCiphertext,
        token_iv: encryptedToken.tokenIv,
        token_auth_tag: encryptedToken.tokenAuthTag,
        snapshot: sampleSnapshot,
        snapshot_type: 'frozen',
        expires_at: null,
        is_active: true,
        view_count: 3,
        passcode_hash: null,
        passcode_salt: null,
        created_at: '2026-06-24T12:00:00.000Z',
        updated_at: '2026-06-24T12:00:00.000Z',
        ...overrides,
    };
}

function mockServeShare(row) {
    mockRpc.mockResolvedValueOnce({
        data: [row],
        error: null,
    });
}

describe('Share Links API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        mockRpc.mockReset();
    });

    it('GET /api/share-links returns 401 without auth', async () => {
        const res = await request(app).get('/api/share-links');
        expect(res.status).toBe(401);
    });

    it('POST /api/share-links validates passcode format', async () => {
        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({
                expiry: '7d',
                fields: { status: true },
                passcode: '12',
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'passcode' })])
        );
    });

    it('POST /api/share-links rejects empty opportunityIds', async () => {
        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({
                expiry: '7d',
                opportunityIds: [],
            });

        expect(res.status).toBe(400);
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'opportunityIds' })])
        );
    });

    it('POST /api/share-links creates a rich frozen share and returns token once', async () => {
        const opportunities = [
            {
                id: OPPORTUNITY_ID,
                title: 'Backend Intern',
                description: 'Work on APIs and infrastructure.',
                link: 'https://example.com/apply',
                deadline: '2026-07-01',
                applied_on: '2026-06-01',
                category: 'internship',
                status: 'rejected',
                created_at: '2026-06-01T00:00:00.000Z',
                rejected_round_number: 2,
                current_round_number: 2,
                notes: 'must never leak',
            },
        ];
        const insertChain = createChain({ data: shareRow({ view_count: 0 }), error: null });

        mockFrom
            .mockReturnValueOnce(createChain({ data: opportunities, error: null }))
            .mockReturnValueOnce(createChain({ data: [], error: null }))
            .mockReturnValueOnce(insertChain);

        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({
                expiry: '7d',
                fields: {
                    status: true,
                    rounds: true,
                    dateApplied: true,
                    description: true,
                    deadline: true,
                    applicationLink: true,
                },
            });

        expect(res.status).toBe(201);
        expect(res.body.token).toMatch(/^[A-Za-z0-9_-]{32,128}$/);
        expect(res.body.url).toContain(`/share/${res.body.token}`);
        expect(res.body.hasPasscode).toBe(false);
        expect(res.body).not.toHaveProperty('user_id');
        expect(res.body.summary.total).toBe(1);
        expect(res.body.canCopy).toBe(true);
        const insertedShare = insertChain.insert.mock.calls[0][0];
        expect(insertedShare.token_hash).toBe(hashToken(res.body.token));
        expect(insertedShare.token_ciphertext).toEqual(expect.any(String));
        expect(insertedShare.snapshot.opportunities[0]).toMatchObject({
            description: 'Work on APIs and infrastructure.',
            dateApplied: '2026-06-01',
            applicationLink: 'https://example.com/apply',
        });
        expect(insertedShare.snapshot.opportunities[0]).not.toHaveProperty('deadline');
        expect(JSON.stringify(insertedShare.snapshot)).not.toContain('must never leak');
        expect(mockFrom).toHaveBeenCalledWith('opportunities');
        expect(mockFrom).toHaveBeenCalledWith('opportunity_rounds');
        expect(mockFrom).toHaveBeenCalledWith('share_links');
    });

    it('POST /api/share-links embeds interview round timelines as snapshot v3', async () => {
        const opportunities = [
            {
                id: OPPORTUNITY_ID,
                title: 'Backend Intern',
                category: 'internship',
                status: 'interviewed',
                created_at: '2026-06-01T00:00:00.000Z',
                current_round_number: 2,
            },
        ];
        const rounds = [
            {
                opportunity_id: OPPORTUNITY_ID,
                round_number: 1,
                round_type: 'oa',
                scheduled_date: '2026-06-10',
                scheduled_time: '15:00:00',
                result: 'cleared',
                notes: 'private notes',
            },
            {
                opportunity_id: OPPORTUNITY_ID,
                round_number: 2,
                round_type: 'technical',
                scheduled_date: null,
                result: 'pending',
            },
        ];
        const insertChain = createChain({ data: shareRow({ view_count: 0 }), error: null });

        mockFrom
            .mockReturnValueOnce(createChain({ data: opportunities, error: null }))
            .mockReturnValueOnce(createChain({ data: rounds, error: null }))
            .mockReturnValueOnce(insertChain);

        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({ expiry: '7d', fields: { rounds: true, status: true } });

        expect(res.status).toBe(201);
        const snapshot = insertChain.insert.mock.calls[0][0].snapshot;
        expect(snapshot.version).toBe(3);
        expect(snapshot.opportunities[0].interviewRounds).toEqual([
            {
                roundNumber: 1,
                roundType: 'oa',
                scheduledDate: '2026-06-10',
                scheduledTime: '15:00:00',
                result: 'cleared',
            },
            {
                roundNumber: 2,
                roundType: 'technical',
                scheduledDate: null,
                scheduledTime: null,
                result: 'pending',
            },
        ]);
        expect(JSON.stringify(snapshot)).not.toContain('private notes');
    });

    it('POST /api/share-links creates a specific-opportunity share snapshot', async () => {
        const opportunities = [
            {
                id: OPPORTUNITY_ID,
                title: 'Backend Intern',
                description: 'Work on APIs and infrastructure.',
                link: 'https://example.com/apply',
                deadline: '2026-07-01',
                category: 'internship',
                status: 'rejected',
                created_at: '2026-06-01T00:00:00.000Z',
                rejected_round_number: 2,
                current_round_number: 2,
            },
        ];
        const opportunitiesChain = createChain({ data: opportunities, error: null });
        const insertChain = createChain({ data: shareRow({ view_count: 0 }), error: null });

        mockFrom
            .mockReturnValueOnce(opportunitiesChain)
            .mockReturnValueOnce(createChain({ data: [], error: null }))
            .mockReturnValueOnce(insertChain);

        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({
                expiry: '7d',
                opportunityIds: [OPPORTUNITY_ID],
            });

        expect(res.status).toBe(201);
        expect(opportunitiesChain.in).toHaveBeenCalledWith('id', [OPPORTUNITY_ID]);
        const insertedShare = insertChain.insert.mock.calls[0][0];
        expect(insertedShare.snapshot.options.selectionMode).toBe('specific');
        expect(insertedShare.snapshot.summary.total).toBe(1);
    });

    it('POST /api/share-links rejects unknown opportunity IDs', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));

        const res = await request(app)
            .post('/api/share-links')
            .set(authHeader)
            .send({
                expiry: '7d',
                opportunityIds: [OPPORTUNITY_ID],
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Invalid opportunity selection');
    });

    it('GET /api/share-links lists owner metadata with a copyable URL and without raw token fields', async () => {
        mockFrom.mockReturnValue(createChain({ data: [shareRow()], error: null }));

        const res = await request(app).get('/api/share-links').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body[0].id).toBe('00000000-0000-4000-8000-000000000099');
        expect(res.body[0].viewCount).toBe(3);
        expect(res.body[0].summary.total).toBe(1);
        expect(res.body[0].canCopy).toBe(true);
        expect(res.body[0].url).toBe(`http://localhost:3000/share/${VALID_TOKEN}`);
        expect(res.body[0]).not.toHaveProperty('token');
        expect(res.body[0]).not.toHaveProperty('token_hash');
        expect(res.body[0]).not.toHaveProperty('user_id');
    });

    it('GET /api/share-links marks legacy shares without encrypted tokens as not copyable', async () => {
        mockFrom.mockReturnValue(createChain({
            data: [
                shareRow({
                    token_ciphertext: null,
                    token_iv: null,
                    token_auth_tag: null,
                }),
            ],
            error: null,
        }));

        const res = await request(app).get('/api/share-links').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body[0].canCopy).toBe(false);
        expect(res.body[0].url).toBeNull();
    });

    it('DELETE /api/share-links/:id revokes owner share', async () => {
        mockFrom.mockReturnValue(createChain({
            data: shareRow({ is_active: false }),
            error: null,
        }));

        const res = await request(app)
            .delete('/api/share-links/00000000-0000-4000-8000-000000000099')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.isActive).toBe(false);
    });

    it('GET /api/public/share-links/:token returns public snapshot without auth or owner fields', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: shareRow(), error: null }));
        mockServeShare(shareRow({ view_count: 4 }));

        const res = await request(app).get(`/api/public/share-links/${VALID_TOKEN}`);

        expect(res.status).toBe(200);
        expect(res.body.snapshot.summary.total).toBe(1);
        expect(res.body.viewCount).toBe(4);
        expect(res.body.snapshot.opportunities[0]).toMatchObject({
            description: 'Work on APIs and infrastructure.',
            deadline: '2026-07-01',
            applicationLink: 'https://example.com/apply',
        });
        expect(res.body).not.toHaveProperty('user_id');
        expect(res.body).not.toHaveProperty('token_hash');
        expect(JSON.stringify(res.body)).not.toContain('must never leak');
        expect(mockRpc).toHaveBeenCalledWith('serve_public_share_link', {
            p_share_id: '00000000-0000-4000-8000-000000000099',
        });
    });

    it('GET /api/public/share-links/:token can be opened repeatedly while active', async () => {
        mockFrom
            .mockReturnValueOnce(createChain({ data: shareRow({ view_count: 3 }), error: null }))
            .mockReturnValueOnce(createChain({ data: shareRow({ view_count: 4 }), error: null }));
        mockServeShare(shareRow({ view_count: 4 }));
        mockServeShare(shareRow({ view_count: 5 }));

        const first = await request(app).get(`/api/public/share-links/${VALID_TOKEN}`);
        const second = await request(app).get(`/api/public/share-links/${VALID_TOKEN}`);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(first.body.viewCount).toBe(4);
        expect(second.body.viewCount).toBe(5);
    });

    it('GET /api/public/share-links/:token gracefully rejects expired or revoked links', async () => {
        mockFrom.mockReturnValue(createChain({
            data: null,
            error: { code: 'PGRST116' },
        }));

        const res = await request(app).get(`/api/public/share-links/${VALID_TOKEN}`);

        expect(res.status).toBe(410);
        expect(res.body.message).toBe('This link has expired or been revoked.');
    });

    it('GET /api/public/share-links/:token gates passcode-protected links', async () => {
        const { passcodeHash, passcodeSalt } = createPasscodeHash('1234');
        mockFrom.mockReturnValue(createChain({
            data: shareRow({ passcode_hash: passcodeHash, passcode_salt: passcodeSalt }),
            error: null,
        }));

        const res = await request(app).get(`/api/public/share-links/${VALID_TOKEN}`);

        expect(res.status).toBe(200);
        expect(res.body.requiresPasscode).toBe(true);
        expect(res.body).not.toHaveProperty('snapshot');
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it('POST /api/public/share-links/:token/verify rejects wrong passcode', async () => {
        const { passcodeHash, passcodeSalt } = createPasscodeHash('1234');
        mockFrom.mockReturnValue(createChain({
            data: shareRow({ passcode_hash: passcodeHash, passcode_salt: passcodeSalt }),
            error: null,
        }));

        const res = await request(app)
            .post(`/api/public/share-links/${VALID_TOKEN}/verify`)
            .send({ passcode: '9999' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid Passcode');
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it('POST /api/public/share-links/:token/verify returns snapshot on correct passcode', async () => {
        const { passcodeHash, passcodeSalt } = createPasscodeHash('1234');
        mockFrom.mockReturnValueOnce(createChain({
            data: shareRow({ passcode_hash: passcodeHash, passcode_salt: passcodeSalt }),
            error: null,
        }));
        mockServeShare(shareRow({ view_count: 4, passcode_hash: passcodeHash, passcode_salt: passcodeSalt }));

        const res = await request(app)
            .post(`/api/public/share-links/${VALID_TOKEN}/verify`)
            .send({ passcode: '1234' });

        expect(res.status).toBe(200);
        expect(res.body.snapshot.opportunities[0].title).toBe('Backend Intern');
        expect(res.body.viewCount).toBe(4);
    });
});
