/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["xlsx", "pdf-parse", "pdfjs-dist"],
  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname:"/**",
      },
    ],
  },
};

module.exports = nextConfig;