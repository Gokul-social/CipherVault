/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable the SDK workspace package to be transpiled by Next.js
  transpilePackages: ["@ciphervault/sdk"],
  // Webpack config for Solana web3.js compatibility in the browser
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
