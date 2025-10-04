// @ts-nocheck
import withPWA from "next-pwa";

const isDev = process.env.NODE_ENV === "development";

// Konfigurasi dasar Next.js (bukan untuk plugin)
const baseConfig = {
  reactStrictMode: true,
  experimental: {
    turbo: false // pastikan pakai Webpack, bukan Turbopack
  }
};

// Bungkus config dasar dengan konfigurasi PWA
const nextConfig = withPWA({
  dest: "public",
  disable: isDev,
})(baseConfig);

export default nextConfig;
