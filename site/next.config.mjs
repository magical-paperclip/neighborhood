/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: 'standalone',
  // Ensure images from your domain are allowed
  images: {
    domains: ['neighborhood.hackclub.com'],
  },
};

export default nextConfig;
