/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep leftover CRA `src/pages/*.jsx` from being compiled as Pages Router routes
  // until the workspace App Router PR lands.
  pageExtensions: ['tsx', 'ts'],
  experimental: {
    optimizePackageImports: ['react-icons', 'recharts', 'framer-motion'],
  },
  webpack: (config) => {
    const preferred = ['.ts', '.tsx', '.js', '.jsx'];
    config.resolve.extensions = [
      ...preferred,
      ...(config.resolve.extensions || []).filter((ext) => !preferred.includes(ext)),
    ];
    return config;
  },
  async redirects() {
    return [
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/privacy.html', destination: '/privacy', permanent: true },
      {
        source: '/guides/internship-application-tracker.html',
        destination: '/guides/internship-application-tracker',
        permanent: true,
      },
      {
        source: '/guides/hackathon-deadline-tracker.html',
        destination: '/guides/hackathon-deadline-tracker',
        permanent: true,
      },
      {
        source: '/guides/job-tracker-vs-spreadsheet.html',
        destination: '/guides/job-tracker-vs-spreadsheet',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
