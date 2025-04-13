/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Fix for native module issues
    config.resolve.alias = {
      ...config.resolve.alias,
      // Replace problematic modules with empty modules if needed
    };
    return config;
  },
};

module.exports = nextConfig; 