/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
