import { getDefaultApiUrl } from './apiUrl';

describe('getDefaultApiUrl', () => {
    it('uses the new Render API for production builds', () => {
        expect(getDefaultApiUrl('production')).toBe('https://futurestack-aeyn.onrender.com/api/v1');
    });

    it('keeps local development on the local versioned API', () => {
        expect(getDefaultApiUrl('development')).toBe('http://localhost:3001/api/v1');
    });
});
