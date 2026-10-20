import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { isIP } from "node:net";

function validateVercelApiBaseUrl() {
  const rawUrl = process.env.VITE_API_BASE_URL?.trim();
  if (!rawUrl) {
    throw new Error(
      "Missing VITE_API_BASE_URL in Vercel environment variables.\n" +
      "Please go to Vercel -> Project Settings -> Environment Variables and add:\n" +
      "Key: VITE_API_BASE_URL\n" +
      "Value: https://<your-render-service>.onrender.com/api"
    );
  }

  let apiUrl;
  try {
    apiUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL format for VITE_API_BASE_URL: "${rawUrl}". It must start with https://`);
  }

  const hostname = apiUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    apiUrl.protocol !== "https:" ||
    apiUrl.username ||
    apiUrl.password ||
    apiUrl.search ||
    apiUrl.hash ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    isIP(hostname) !== 0
  ) {
    throw new Error(
      `Invalid VITE_API_BASE_URL: "${rawUrl}". It must be a public HTTPS URL without credentials, port, or query params.`
    );
  }

  // If user entered https://my-backend.onrender.com without /api, normalize it
  if (!apiUrl.pathname.replace(/\/+$/, "").endsWith("/api")) {
    const normalized = `${apiUrl.origin}/api`;
    process.env.VITE_API_BASE_URL = normalized;
    console.warn(`[vite] Notice: Automatically normalized VITE_API_BASE_URL to include /api: ${normalized}`);
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
