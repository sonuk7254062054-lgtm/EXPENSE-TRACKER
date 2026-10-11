const allowedMethods = "GET, HEAD, POST, PATCH, DELETE, OPTIONS";
const allowedHeaders = "Content-Type, X-CSRF-Token";

export function createCorsMiddleware(allowedOrigin) {
  return (req, res, next) => {
    if (!allowedOrigin || !req.get("Origin")) {
      return next();
    }

    if (req.get("Origin") !== allowedOrigin) {
      return res.status(403).json({
        error: {
          code: "CORS_ORIGIN_DENIED",
          message: "Origin is not allowed",
        },
      });
    }

    res.vary("Origin");
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", allowedMethods);
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
      return res.status(204).end();
    }

    return next();
  };
}
