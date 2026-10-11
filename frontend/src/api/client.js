const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function decodeResponse(response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return response.json();
  return null;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const upperMethod = method.toUpperCase();
  const requestHeaders = new Headers(headers);
  const options = {
    method: upperMethod,
    credentials: "include",
    headers: requestHeaders,
  };

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
    options.body = JSON.stringify(body);
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(upperMethod)) {
    const csrfResponse = await fetch(`${API_ROOT}/auth/csrf`, {
      credentials: "include",
    });
    const csrfPayload = await decodeResponse(csrfResponse);
    if (!csrfResponse.ok || !csrfPayload?.data?.csrfToken) {
      throw new ApiError(
        csrfResponse.status,
        csrfPayload?.error?.code ?? "CSRF_UNAVAILABLE",
        csrfPayload?.error?.message ?? "Could not prepare a secure request",
      );
    }
    requestHeaders.set("x-csrf-token", csrfPayload.data.csrfToken);
  }

  const response = await fetch(`${API_ROOT}${path}`, options);
  const payload = await decodeResponse(response);
  if (!response.ok) {
    if (response.status === 401 && !["/auth/login", "/auth/register"].includes(path)) {
      window.dispatchEvent(new Event("expense:unauthorized"));
    }
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "The request could not be completed",
      payload?.error?.details,
    );
  }
  return payload;
}

function queryString(values) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  currentUser: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  transactions: (filters) => request(`/transactions${queryString(filters)}`),
  createTransaction: (data) =>
    request("/transactions", { method: "POST", body: data }),
  updateTransaction: (id, data) =>
    request(`/transactions/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: data,
    }),
  deleteTransaction: (id) =>
    request(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  summary: (filters) => request(`/reports/summary${queryString(filters)}`),
  monthly: (filters) => request(`/reports/monthly${queryString(filters)}`),
  categories: (filters) => request(`/reports/categories${queryString(filters)}`),
};

export { queryString };
