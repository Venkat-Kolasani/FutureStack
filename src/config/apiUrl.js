export const getDefaultApiUrl = (environment) => (
    environment === 'production'
        ? 'https://futurestack-aeyn.onrender.com/api/v1'
        : 'http://localhost:3001/api/v1'
);
