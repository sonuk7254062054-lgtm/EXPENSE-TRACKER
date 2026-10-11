import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { isIP } from "node:net";

function validateVercelApiBaseUrl() {
  const configuredUrl = process.env.VITE_API_BASE_URL;
  if (!configuredUrl) {
    throw new Error("VITE_API_BASE_URL must be set to the deployed HTTPS API base URL on Vercel");
  }

  let apiUrl;
  try {
    apiUrl = new URL(configuredUrl);
  } catch {
    throw new Error("VITE_API_BASE_URL must be a valid HTTPS API base URL on Vercel");
  }

  const hostname = apiUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    apiUrl.protocol !== "https:" ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash ||
    apiUrl.pathname.replace(/\/+$/, "") !== "/api" ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isIP(hostname) !== 0
  ) {
    throw new Error("VITE_API_BASE_URL must be an external HTTPS host with the /api path and no credentials");
  }
}

export default defineConfig(({ command }) => {
  if (command === "build" && process.env.VERCEL === "1") {
    validateVercelApiBaseUrl();
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000",
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/vitest.setup.js",
      clearMocks: true,
    },
  };
});
