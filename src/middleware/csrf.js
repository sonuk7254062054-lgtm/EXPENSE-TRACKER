import { randomBytes, timingSafeEqual } from "node:crypto";

function constantTimeMatch(expected, supplied) {
  if (
    typeof expected !== "string" ||
    typeof supplied !== "string" ||
    !/^[a-f0-9]{64}$/i.test(supplied)
  ) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export function requireCsrf() {
  return (req, res, next) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString("hex");
    }

    if (!constantTimeMatch(req.session.csrfToken, req.get("x-csrf-token"))) {
      return res.status(403).json({
        error: { code: "CSRF_INVALID", message: "CSRF token is missing or invalid" },
      });
    }

    return next();
  };
}
