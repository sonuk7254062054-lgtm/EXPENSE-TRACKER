const allowedMethods = "GET, HEAD, POST, PATCH, DELETE, OPTIONS";
const allowedHeaders = "Content-Type, X-CSRF-Token";

function isOriginAllowed(origin, allowedOrigin) {
  if (!origin) return false;
  if (!allowedOrigin) return true;

  // Exact match with configured FRONTEND_ORIGIN
  if (origin === allowedOrigin) return true;

  try {
    const originUrl = new URL(origin);
    const configuredUrl = new URL(allowedOrigin);

    // If both are on vercel.app and use https, allow Vercel preview/branch URLs
    if (
      originUrl.protocol === "https:" &&
      originUrl.hostname.endsWith(".vercel.app") &&
      configuredUrl.hostname.endsWith(".vercel.app")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function createCorsMiddleware(allowedOrigin) {
  return (req, res, next) => {
    const requestOrigin = req.get("Origin");
    if (!allowedOrigin || !requestOrigin) {
      return next();
    }

    if (!isOriginAllowed(requestOrigin, allowedOrigin)) {
      return res.status(403).json({
        error: {
          code: "CORS_ORIGIN_DENIED",
          message: "Origin is not allowed",
        },
      });
    }

    res.vary("Origin");
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", allowedMethods);
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
      return res.status(204).end();
    }

    return next();
  };
}
