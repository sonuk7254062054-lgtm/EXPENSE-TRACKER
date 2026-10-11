export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const candidateStatus = error.statusCode ?? error.status;
  const statusCode =
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus < 600
      ? candidateStatus
      : 500;

  if (statusCode >= 500) {
    console.error("Unhandled request error", {
      name: error.name,
      statusCode,
    });
  }

  return res.status(statusCode).json({
    error: {
      code:
        statusCode >= 500
          ? "INTERNAL_SERVER_ERROR"
          : error.statusCode && error.code
            ? error.code
            : "REQUEST_ERROR",
      message:
        statusCode >= 500
          ? "An unexpected error occurred"
          : error.type === "entity.parse.failed"
            ? "Malformed JSON request body"
            : error.message || "Request failed",
    },
  });
}
