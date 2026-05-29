/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx', 'jszip', 'csv-parse'],
  },
};

export default nextConfig;
