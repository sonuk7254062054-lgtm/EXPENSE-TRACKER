import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { api } from "./client.js";
import { AuthProvider, useAuth } from "../auth/AuthProvider.jsx";
import { ProtectedRoute } from "../auth/ProtectedRoute.jsx";
import { MemoryRouter, Route, Routes } from "react-router-dom";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("API client", () => {
  it("sends cookie credentials and obtains a CSRF token before mutations", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { csrfToken: "csrf-test" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { id: "transaction-1" } }, 201));
    vi.stubGlobal("fetch", fetch);

    await api.createTransaction({ type: "expense" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(fetch.mock.calls[1][1].credentials).toBe("include");
    expect(fetch.mock.calls[1][1].headers.get("x-csrf-token")).toBe("csrf-test");
    expect(fetch.mock.calls[1][1].body).toBe(JSON.stringify({ type: "expense" }));
  });

  it("builds only the supported query parameters", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(jsonResponse({ data: [], pagination: {} }));
    vi.stubGlobal("fetch", fetch);
    await api.transactions({ page: 2, limit: 10, q: "coffee", unused: undefined });
    expect(fetch.mock.calls[0][0]).toBe("/api/transactions?page=2&limit=10&q=coffee");
  });
});

function ProtectedContent() {
  const { user } = useAuth();
  return <h1>Welcome {user.email}</h1>;
}

describe("auth state", () => {
  it("restores a cookie session and renders a protected route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({
      data: { id: "user-1", email: "person@example.com" },
    })));

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <AuthProvider>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/private" element={<ProtectedContent />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Welcome person@example.com" })).toBeInTheDocument();
  });

  it("redirects to login when the restored session has expired", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    }, 401)));
    function LoginMarker() { return <h1>Sign in</h1>; }

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginMarker />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/private" element={<ProtectedContent />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });
});
