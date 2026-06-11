const { createChain } = require('../mocks/supabase');
const { mockRequireAuth, TEST_AUTH } = require('../mocks/auth');

jest.mock('../../src/middleware/auth', () => ({
    requireAuth: (...args) => mockRequireAuth(...args),
}));

const mockFrom = jest.fn();
jest.mock('../../src/lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
    },
}));

const request = require('supertest');
const app = require('../../src/app');

const authHeader = { Authorization: 'Bearer test-token' };

describe('Profile API', () => {
    beforeEach(() => {
        mockFrom.mockReset();
    });

    it('GET /api/profile returns 401 without auth', async () => {
        const res = await request(app).get('/api/profile');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Unauthorized');
    });

    it('GET /api/profile returns existing profile', async () => {
        const existingProfile = {
            id: 'profile-1',
            user_id: TEST_AUTH.internalUserId,
            bio: 'Test bio',
            college: 'Test University',
            degree: 'B.Sc.',
            graduation_year: 2025,
            skills: 'JavaScript, React',
            github_url: 'https://github.com/test',
            linkedin_url: 'https://linkedin.com/in/test',
            portfolio_url: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        mockFrom.mockReturnValue(
            createChain({ data: existingProfile, error: null })
        );

        const res = await request(app)
            .get('/api/profile')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.bio).toBe('Test bio');
        expect(res.body.college).toBe('Test University');
        expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    });

    it('GET /api/profile creates new profile if none exists', async () => {
        const newProfile = {
            id: 'profile-new',
            user_id: TEST_AUTH.internalUserId,
            bio: null,
            college: null,
            degree: null,
            graduation_year: null,
            skills: null,
            github_url: null,
            linkedin_url: null,
            portfolio_url: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // First call returns no profile
        // Second call creates the profile
        mockFrom
            .mockReturnValueOnce(
                createChain({ data: null, error: null }) // maybeSingle returns null
            )
            .mockReturnValueOnce(
                createChain({ data: newProfile, error: null }) // insert
            );

        const res = await request(app)
            .get('/api/profile')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe('profile-new');
    });

    it('GET /api/profile handles race condition with 23505 unique violation', async () => {
        const existingProfile = {
            id: 'profile-existing',
            user_id: TEST_AUTH.internalUserId,
            bio: 'Already exists',
            college: 'Race Condition University',
            degree: null,
            graduation_year: null,
            skills: null,
            github_url: null,
            linkedin_url: null,
            portfolio_url: null,
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // First call: maybeSingle returns null (no profile)
        // Second call: insert fails with 23505 (another request created it)
        // Third call: re-select returns the existing profile
        mockFrom
            .mockReturnValueOnce(
                createChain({ data: null, error: null }) // maybeSingle returns null
            )
            .mockReturnValueOnce(
                createChain({ data: null, error: { code: '23505', message: 'unique constraint' } }) // insert fails
            )
            .mockReturnValueOnce(
                createChain({ data: existingProfile, error: null }) // re-select succeeds
            );

        const res = await request(app)
            .get('/api/profile')
            .set(authHeader);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe('profile-existing');
        expect(res.body.bio).toBe('Already exists');
    });

    it('PATCH /api/profile updates profile successfully', async () => {
        const updatedProfile = {
            id: 'profile-1',
            user_id: TEST_AUTH.internalUserId,
            bio: 'Updated bio',
            college: 'New University',
            degree: 'M.Sc.',
            graduation_year: 2026,
            skills: 'Python, Django',
            github_url: 'https://github.com/new',
            linkedin_url: 'https://linkedin.com/in/new',
            portfolio_url: 'https://newportfolio.com',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        mockFrom.mockReturnValue(
            createChain({ data: updatedProfile, error: null })
        );

        const res = await request(app)
            .patch('/api/profile')
            .set(authHeader)
            .send({
                bio: 'Updated bio',
                college: 'New University',
                degree: 'M.Sc.',
                graduation_year: 2026,
                skills: 'Python, Django',
                github_url: 'https://github.com/new',
                linkedin_url: 'https://linkedin.com/in/new',
                portfolio_url: 'https://newportfolio.com'
            });

        expect(res.status).toBe(200);
        expect(res.body.bio).toBe('Updated bio');
        expect(res.body.college).toBe('New University');
    });

    it('PATCH /api/profile returns 400 for invalid body', async () => {
        const res = await request(app)
            .patch('/api/profile')
            .set(authHeader)
            .send({}); // Empty body

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
    });

    it('PATCH /api/profile returns 400 for invalid URL', async () => {
        const res = await request(app)
            .patch('/api/profile')
            .set(authHeader)
            .send({
                github_url: 'not-a-valid-url'
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'github_url' })])
        );
    });

    it('PATCH /api/profile returns 400 for invalid graduation year', async () => {
        const res = await request(app)
            .patch('/api/profile')
            .set(authHeader)
            .send({
                graduation_year: 1800 // Too old
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'graduation_year' })])
        );
    });

    it('PATCH /api/profile returns 400 for bio exceeding max length', async () => {
        const res = await request(app)
            .patch('/api/profile')
            .set(authHeader)
            .send({
                bio: 'a'.repeat(1001) // Exceeds 1000 character limit
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Validation Error');
        expect(res.body.details).toEqual(
            expect.arrayContaining([expect.objectContaining({ field: 'bio' })])
        );
    });
});