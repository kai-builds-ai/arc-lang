/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Vercel to include Arc stdlib .arc files in the serverless bundle
  outputFileTracingIncludes: {
    '/api/run': ['./node_modules/arc-lang/stdlib/**/*.arc'],
  },
};

module.exports = nextConfig;
