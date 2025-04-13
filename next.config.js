/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tailwindcss/postcss', 'lightningcss'],
  experimental: {
    esmExternals: 'loose'
  }
};

module.exports = nextConfig; 