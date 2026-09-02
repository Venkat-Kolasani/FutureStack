const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const request = require('supertest');
const app = require('../../src/app');
const { HEATMAP_DAY_COUNT } = require('../../src/lib/progressHeatmap');

const authHeader = { Authorization: 'Bearer test-token' };
const TRACK_ID = '11111111-1111-4111-8111-111111111111';
const LOG_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';

const trackRow = {
    id: TRACK_ID,
    user_id: TEST_AUTH.internalUserId,
    name: 'DSA',
    template_type: 'leetcode',
    is_active: true,
    created_at: '2026-08-01T00:00:00.000Z',
};

const logRow = {
    id: LOG_ID,
    user_id: TEST_AUTH.internalUserId,
    track_id: TRACK_ID,
    log_date: '2026-08-21',
    did_log: true,
    what_did_you_do: 'Two graph problems',
    what_did_you_learn: 'Visited-set placement matters',
    metadata: { problems: 2, topics: 'graphs' },
    mood: 'moderate',
    created_at: '2026-08-21T18:00:00.000Z',
};

function mockTables({ tracks = { data: [], error: null }, logs = { data: [], error: null } } = {}) {
    mockFrom.mockImplementation((table) => {
        if (table === 'progress_tracks') return createChain(tracks);
        if (table === 'progress_logs') return createChain(logs);
        return createChain({ data: null, error: null });
    });
}

function expectUserScoped(chain) {
    expect(chain.eq).toHaveBeenCalledWith('user_id', TEST_AUTH.internalUserId);
}

describe('Progress API', () => {
    beforeEach(() => mockFrom.mockReset());

    it('rejects unauthenticated progress requests', async () => {
        const res = await request(app).get('/api/v1/progress/tracks');
        expect(res.status).toBe(401);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('lists tracks for the authenticated user', async () => {
        mockTables({ tracks: { data: [trackRow], error: null } });

        const res = await request(app).get('/api/v1/progress/tracks').set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            {
                id: TRACK_ID,
                name: 'DSA',
                templateType: 'leetcode',
                isActive: true,
                createdAt: trackRow.created_at,
            },
        ]);
        expect(mockFrom).toHaveBeenCalledWith('progress_tracks');
    });

    it('creates a track', async () => {
        mockTables({ tracks: { data: trackRow, error: null } });

        const res = await request(app)
            .post('/api/v1/progress/tracks')
            .set(authHeader)
            .send({ name: 'DSA', templateType: 'leetcode' });

        expect(res.status).toBe(201);
        expect(res.body.templateType).toBe('leetcode');
        expect(res.body.name).toBe('DSA');
    });

    it('rejects an unknown template type without querying', async () => {
        const res = await request(app)
            .post('/api/v1/progress/tracks')
            .set(authHeader)
            .send({ name: 'DSA', templateType: 'gym' });

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('upserts a log for an owned track', async () => {
        const tracksChain = createChain({ data: trackRow, error: null });
        const logsChain = createChain({ data: logRow, error: null });
        mockFrom.mockImplementation((table) => (table === 'progress_tracks' ? tracksChain : logsChain));

        const res = await request(app)
            .post('/api/v1/progress/logs')
            .set(authHeader)
            .send({
                trackId: TRACK_ID,
                logDate: '2026-08-21',
                didLog: true,
                whatDidYouDo: 'Two graph problems',
                whatDidYouLearn: 'Visited-set placement matters',
                metadata: { problems: 2, topics: 'graphs' },
                mood: 'moderate',
            });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            id: LOG_ID,
            trackId: TRACK_ID,
            logDate: '2026-08-21',
            didLog: true,
            whatDidYouDo: 'Two graph problems',
            mood: 'moderate',
            trackName: 'DSA',
            templateType: 'leetcode',
        });
        expect(logsChain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: TEST_AUTH.internalUserId,
                track_id: TRACK_ID,
                log_date: '2026-08-21',
                did_log: true,
            }),
            { onConflict: 'track_id,log_date' }
        );
    });

    it('skips what-did-you-do when the day was off', async () => {
        const offLog = { ...logRow, did_log: false, what_did_you_do: null, mood: null };
        const tracksChain = createChain({ data: trackRow, error: null });
        const logsChain = createChain({ data: offLog, error: null });
        mockFrom.mockImplementation((table) => (table === 'progress_tracks' ? tracksChain : logsChain));

        const res = await request(app)
            .post('/api/v1/progress/logs')
            .set(authHeader)
            .send({
                trackId: TRACK_ID,
                logDate: '2026-08-21',
                didLog: false,
            });

        expect(res.status).toBe(201);
        expect(logsChain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ did_log: false, what_did_you_do: null }),
            expect.any(Object)
        );
    });

    it('requires a note when the day was logged', async () => {
        const res = await request(app)
            .post('/api/v1/progress/logs')
            .set(authHeader)
            .send({
                trackId: TRACK_ID,
                logDate: '2026-08-21',
                didLog: true,
            });

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns a dense 365-day heatmap including zeros', async () => {
        mockTables({
            logs: {
                data: [{ log_date: '2026-08-20', did_log: true, track_id: TRACK_ID }],
                error: null,
            },
            tracks: {
                data: [{ id: TRACK_ID, name: 'DSA' }],
                error: null,
            },
        });

        const res = await request(app)
            .get('/api/v1/progress/heatmap')
            .query({ end: '2026-08-24' })
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(HEATMAP_DAY_COUNT);
        expect(res.body[0].count).toBe(0);
        expect(res.body.find((day) => day.date === '2026-08-20')).toEqual({
            date: '2026-08-20',
            count: 1,
            tracks: ['DSA'],
        });
        expect(res.body[res.body.length - 1]).toEqual({
            date: '2026-08-24',
            count: 0,
            tracks: [],
        });
    });

    it('lists logs for a calendar day across tracks', async () => {
        mockTables({
            logs: { data: [logRow], error: null },
            tracks: { data: [trackRow], error: null },
        });

        const res = await request(app)
            .get('/api/v1/progress/logs/date/2026-08-21')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body[0].trackName).toBe('DSA');
        expect(res.body[0].logDate).toBe('2026-08-21');
    });

    it('rejects calendar-invalid dates on heatmap query', async () => {
        const res = await request(app)
            .get('/api/v1/progress/heatmap')
            .query({ end: '2026-02-30' })
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('rejects calendar-invalid dates on logs-by-date route', async () => {
        const res = await request(app)
            .get('/api/v1/progress/logs/date/2026-02-30')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('rejects invalid UUID params without querying', async () => {
        const res = await request(app)
            .get('/api/v1/progress/logs/not-a-uuid')
            .set(authHeader);

        expect(res.status).toBe(400);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('updates an owned track and scopes by user', async () => {
        const updatedTrack = { ...trackRow, name: 'System Design' };
        const tracksChain = createChain({ data: updatedTrack, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/v1/progress/tracks/${TRACK_ID}`)
            .set(authHeader)
            .send({ name: 'System Design' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('System Design');
        expectUserScoped(tracksChain);
        expect(tracksChain.update).toHaveBeenCalledWith({ name: 'System Design' });
    });

    it('returns 404 when updating a missing track', async () => {
        const tracksChain = createChain({ data: null, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/v1/progress/tracks/${TRACK_ID}`)
            .set(authHeader)
            .send({ name: 'Missing' });

        expect(res.status).toBe(404);
        expectUserScoped(tracksChain);
    });

    it('deletes an owned track and scopes by user', async () => {
        const tracksChain = createChain({ data: { id: TRACK_ID }, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .delete(`/api/v1/progress/tracks/${TRACK_ID}`)
            .set(authHeader);

        expect(res.status).toBe(204);
        expectUserScoped(tracksChain);
        expect(tracksChain.delete).toHaveBeenCalled();
    });

    it('lists logs for an owned track', async () => {
        const tracksChain = createChain({ data: trackRow, error: null });
        const logsChain = createChain({ data: [logRow], error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_tracks') return tracksChain;
            if (table === 'progress_logs') return logsChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .get(`/api/v1/progress/logs/${TRACK_ID}`)
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({
            trackName: 'DSA',
            templateType: 'leetcode',
            logDate: '2026-08-21',
        });
        expectUserScoped(logsChain);
        expect(logsChain.eq).toHaveBeenCalledWith('track_id', TRACK_ID);
    });

    it('returns 404 when listing logs for a missing track', async () => {
        const tracksChain = createChain({ data: null, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .get(`/api/v1/progress/logs/${TRACK_ID}`)
            .set(authHeader);

        expect(res.status).toBe(404);
    });

    it('updates a log with track metadata in the response', async () => {
        const updatedLog = { ...logRow, what_did_you_learn: 'Updated insight' };
        const fetchChain = createChain({ data: logRow, error: null });
        const updateChain = createChain({ data: updatedLog, error: null });
        const tracksChain = createChain({ data: trackRow, error: null });
        let logsCall = 0;

        mockFrom.mockImplementation((table) => {
            if (table === 'progress_logs') {
                logsCall += 1;
                return logsCall === 1 ? fetchChain : updateChain;
            }
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/v1/progress/logs/${LOG_ID}`)
            .set(authHeader)
            .send({ whatDidYouLearn: 'Updated insight' });

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            trackName: 'DSA',
            templateType: 'leetcode',
            whatDidYouLearn: 'Updated insight',
        });
        expectUserScoped(fetchChain);
        expectUserScoped(updateChain);
    });

    it('rejects PATCH that sets didLog true without a note on the resulting record', async () => {
        const offDayLog = { ...logRow, did_log: false, what_did_you_do: null };
        const fetchChain = createChain({ data: offDayLog, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_logs') return fetchChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/v1/progress/logs/${LOG_ID}`)
            .set(authHeader)
            .send({ didLog: true });

        expect(res.status).toBe(400);
        expect(fetchChain.update).not.toHaveBeenCalled();
    });

    it('allows PATCH off-day updates without a note', async () => {
        const offDayLog = { ...logRow, did_log: false, what_did_you_do: null, mood: null };
        const fetchChain = createChain({ data: logRow, error: null });
        const updateChain = createChain({ data: offDayLog, error: null });
        const tracksChain = createChain({ data: trackRow, error: null });
        let logsCall = 0;

        mockFrom.mockImplementation((table) => {
            if (table === 'progress_logs') {
                logsCall += 1;
                return logsCall === 1 ? fetchChain : updateChain;
            }
            if (table === 'progress_tracks') return tracksChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .patch(`/api/v1/progress/logs/${LOG_ID}`)
            .set(authHeader)
            .send({ didLog: false });

        expect(res.status).toBe(200);
        expect(res.body.didLog).toBe(false);
    });

    it('deletes an owned log and scopes by user', async () => {
        const logsChain = createChain({ data: { id: LOG_ID }, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_logs') return logsChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .delete(`/api/v1/progress/logs/${LOG_ID}`)
            .set(authHeader);

        expect(res.status).toBe(204);
        expectUserScoped(logsChain);
        expect(logsChain.delete).toHaveBeenCalled();
    });

    it('returns 404 when deleting another user log', async () => {
        const logsChain = createChain({ data: null, error: null });
        mockFrom.mockImplementation((table) => {
            if (table === 'progress_logs') return logsChain;
            return createChain({ data: null, error: null });
        });

        const res = await request(app)
            .delete(`/api/v1/progress/logs/${LOG_ID}`)
            .set(authHeader);

        expect(res.status).toBe(404);
        expectUserScoped(logsChain);
        expect(logsChain.eq).not.toHaveBeenCalledWith('user_id', OTHER_USER_ID);
    });
});
