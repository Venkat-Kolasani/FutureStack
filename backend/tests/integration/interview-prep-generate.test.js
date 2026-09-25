const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: { from: (...args) => mockFrom(...args) },
}));

const mockGenerateObject = jest.fn();
jest.mock('../../src/lib/llm', () => ({
    generateObject: (...args) => mockGenerateObject(...args),
    generateText: jest.fn(),
    getProviderInfo: () => ({ provider: 'gemini', model: 'gemini-2.5-flash' }),
    createModel: jest.fn(),
    resolveOptions: jest.fn(),
}));

const mockGetKey = jest.fn();
jest.mock('../../src/lib/userAiSettings', () => ({
    getUserDecryptedApiKey: (...args) => mockGetKey(...args),
    getUserAiSettingsSummary: jest.fn(),
    resolveUserLlmOptions: jest.fn(),
    KEY_REFRESH_MESSAGE: 'refresh',
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };

describe('Interview prep generation', () => {
    beforeEach(() => {
        mockFrom.mockReset();
        mockGenerateObject.mockReset();
        mockGetKey.mockReset();
    });

    it('returns 401 without auth', async () => {
        const res = await request(app).post('/api/interview-prep/opp-1/generate').send({
            kind: 'questions',
            focus: 'technical',
            provider: 'gemini',
        });
        expect(res.status).toBe(401);
    });

    it('returns 404 for a non-internship', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'hackathon' }, error: null }));
        const res = await request(app)
            .post('/api/interview-prep/opp-1/generate')
            .set(authHeader)
            .send({ kind: 'questions', focus: 'technical', provider: 'gemini' });
        expect(res.status).toBe(404);
    });

    it('returns 400 when the user has no saved key', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'internship' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({
            data: { title: 'Role', description: 'Build APIs', notes: '' },
            error: null,
        }));
        mockGetKey.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/interview-prep/opp-1/generate')
            .set(authHeader)
            .send({ kind: 'questions', focus: 'technical', provider: 'gemini' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('API_KEY_REQUIRED');
        expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('returns a structured draft and does not insert rows', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'internship' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({
            data: { title: 'Role', description: 'Build APIs', notes: 'Node' },
            error: null,
        }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockGetKey.mockResolvedValue({ apiKey: 'secret-key-value', provider: 'gemini', model: 'gemini-2.5-flash' });
        mockGenerateObject.mockResolvedValue({
            questions: [{ question: 'How does an API route authorize a user?', answer: 'Check the session, then the owner id.' }],
        });

        const res = await request(app)
            .post('/api/interview-prep/opp-1/generate')
            .set(authHeader)
            .send({ kind: 'questions', focus: 'technical', provider: 'gemini' });

        expect(res.status).toBe(200);
        expect(res.body.draft.questions[0].question).toMatch(/authorize/);
        expect(res.body.provider).toBe('gemini');
        expect(JSON.stringify(res.body)).not.toContain('secret-key-value');
        expect(mockFrom).not.toHaveBeenCalledWith('interview_questions');
    });

    it('accepts only the selected questions and skips duplicates', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'internship' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: { id: 'prep-1', company_research: '' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({
            data: [{ question: 'How does an API route authorize a user?' }],
            error: null,
        }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockFrom.mockReturnValueOnce(createChain({
            data: [{ question: 'What is a new question?', is_exam: true, focus: 'technical' }],
            error: null,
        }));

        const res = await request(app)
            .post('/api/interview-prep/opp-1/generate/accept')
            .set(authHeader)
            .send({
                focus: 'technical',
                questions: [
                    { question: 'How does an API route authorize a user?', answer: 'Existing', is_exam: false },
                    { question: 'What is a new question?', answer: 'A new answer', is_exam: true },
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.questions).toEqual(expect.arrayContaining([
            expect.objectContaining({ question: 'What is a new question?', is_exam: true }),
        ]));
        expect(res.body.questions).toHaveLength(1);
    });

    it('seeds a starter pack once', async () => {
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'internship' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: { id: 'prep-1' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: [], error: null }));
        mockFrom.mockReturnValue(createChain({ data: [{ id: 'new' }], error: null }));

        const first = await request(app)
            .post('/api/interview-prep/opp-1/starter')
            .set(authHeader)
            .send({ focus: 'general' });

        expect(first.status).toBe(200);
        expect(first.body.added.questions).toBeGreaterThan(0);

        mockFrom.mockReset();
        mockFrom.mockReturnValueOnce(createChain({ data: { category: 'internship' }, error: null }));
        mockFrom.mockReturnValueOnce(createChain({ data: { id: 'prep-1' }, error: null }));
        const { PACKS } = require('../../src/lib/interviewPrepPacks');
        mockFrom.mockReturnValueOnce(createChain({
            data: PACKS.general.questions.map((row) => ({ question: row.question })),
            error: null,
        }));
        mockFrom.mockReturnValueOnce(createChain({
            data: PACKS.general.topics.map((row) => ({ topic: row.topic })),
            error: null,
        }));
        mockFrom.mockReturnValueOnce(createChain({
            data: PACKS.general.behavioral.map((row) => ({ question: row.question })),
            error: null,
        }));

        const second = await request(app)
            .post('/api/interview-prep/opp-1/starter')
            .set(authHeader)
            .send({ focus: 'general' });

        expect(second.status).toBe(200);
        expect(second.body.added).toEqual({ questions: 0, topics: 0, behavioral: 0 });
    });

    it('rejects an invalid focus', async () => {
        const res = await request(app)
            .post('/api/interview-prep/opp-1/starter')
            .set(authHeader)
            .send({ focus: 'magic' });
        expect(res.status).toBe(400);
    });

    it('lists only the caller stories', async () => {
        mockFrom.mockReturnValueOnce(createChain({
            data: [{ id: 'prep-1', opportunities: { title: 'Acme' } }],
            error: null,
        }));
        mockFrom.mockReturnValueOnce(createChain({
            data: [{ id: 'story-1', prep_id: 'prep-1', question: 'Tell me about a conflict' }],
            error: null,
        }));

        const res = await request(app).get('/api/interview-prep/stories').set(authHeader);
        expect(res.status).toBe(200);
        expect(res.body.stories[0].company).toBe('Acme');
        expect(mockFrom).toHaveBeenCalledWith('interview_prep');
    });
});

describe('AI settings provider list', () => {
    it('does not echo ciphertext fields from the summary helper', () => {
        const { keyHint } = require('../../src/lib/apiKeyVault');
        const hint = keyHint('sk-test-key-1234567890');
        expect(hint).not.toContain('sk-test-key-1234567890');
        expect(TEST_AUTH.internalUserId).toBeTruthy();
    });
});
