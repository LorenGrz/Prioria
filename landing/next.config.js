/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // static site — deployed to S3 + CloudFront (OAC), no Node server
  images: { unoptimized: true }, // next/image optimization needs a server; static export has none
  trailingSlash: true,
};

module.exports = nextConfig;
