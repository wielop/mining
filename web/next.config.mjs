/** @type {import('next').NextConfig} */
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  output: "standalone",
  experimental: {
    turbo: {
      resolveAlias: {
        bs58: path.join(__dirname, "lib", "bs58-shim.ts"),
        "pino-pretty": path.join(__dirname, "lib", "pino-pretty-shim.ts"),
      },
    },
  },
  webpack: (config) => {
    // Solana deps import `bs58` as a default export, but Next/webpack interop can
    // sometimes resolve it to an empty module, causing runtime:
    // "Cannot read properties of undefined (reading 'encode')".
    // Force `bs58` to a stable shim with both default + named exports.
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      bs58: path.join(__dirname, "lib", "bs58-shim.ts"),
      // Some transitive deps (e.g. loggers) may `require("pino-pretty")` even
      // though it's optional; bundling then fails with "Module not found".
      "pino-pretty": path.join(__dirname, "lib", "pino-pretty-shim.ts"),
    };
    return config;
  },
};

export default nextConfig;
