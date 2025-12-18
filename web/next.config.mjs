/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: [
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-wallets",
      "@solana/wallet-adapter-react-ui",
    ],
  },
};

export default nextConfig;

