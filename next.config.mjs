/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  basePath: '',
  images: {
    unoptimized: true
  },
  devIndicators: false
};

export default nextConfig;
