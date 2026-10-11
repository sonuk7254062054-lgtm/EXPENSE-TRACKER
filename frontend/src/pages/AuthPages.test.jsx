import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider.jsx";
import { ProtectedRoute } from "../auth/ProtectedRoute.jsx";
import { AppShell } from "../components/AppShell.jsx";
import { LoginPage, RegisterPage } from "./AuthPages.jsx";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderAuthRoute(path, routes) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>{routes}</Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function csrfResponse() {
  return jsonResponse({ data: { csrfToken: "csrf-test" } });
}

describe("authentication pages", () => {
  it("logs in and returns to the originally requested protected page", async () => {
    const fetch = vi.fn(async (url) => {
      if (url === "/api/auth/me") {
        return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, 401);
      }
      if (url === "/api/auth/csrf") return csrfResponse();
      if (url === "/api/auth/login") {
        return jsonResponse({ data: { id: "user-1", email: "person@example.com" } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    renderAuthRoute("/private", (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<h1>Private dashboard</h1>} />
        </Route>
      </>
    ));

    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: " person@example.com " },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Private dashboard" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({
      credentials: "include",
      body: JSON.stringify({ email: "person@example.com", password: "secure-password" }),
    }));
  });

  it("shows login failures accessibly and allows another attempt", async () => {
    const fetch = vi.fn(async (url) => {
      if (url === "/api/auth/me" || url === "/api/auth/login") {
        return jsonResponse({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect" } }, 401);
      }
      if (url === "/api/auth/csrf") return csrfResponse();
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    renderAuthRoute("/login", <Route path="/login" element={<LoginPage />} />);
    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "bad-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("disables login submission while the API request is pending", async () => {
    let finishLogin;
    const fetch = vi.fn((url) => {
      if (url === "/api/auth/me") {
        return Promise.resolve(jsonResponse({
          error: { code: "UNAUTHENTICATED", message: "Sign in required" },
        }, 401));
      }
      if (url === "/api/auth/csrf") return Promise.resolve(csrfResponse());
      if (url === "/api/auth/login") {
        return new Promise((resolve) => {
          finishLogin = () => resolve(jsonResponse({
            data: { id: "user-1", email: "person@example.com" },
          }));
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    renderAuthRoute("/login", (
      <>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h1>Dashboard</h1>} />
      </>
    ));
    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();
    finishLogin();
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("shows registration success only after the API accepts the new account", async () => {
    const fetch = vi.fn(async (url) => {
      if (url === "/api/auth/me") {
        return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, 401);
      }
      if (url === "/api/auth/csrf") return csrfResponse();
      if (url === "/api/auth/register") {
        return jsonResponse({ data: { id: "user-1", email: "person@example.com" } }, 201);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    renderAuthRoute("/register", <Route path="/register" element={<RegisterPage />} />);
    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Account created" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
      credentials: "include",
      body: JSON.stringify({ email: "person@example.com", password: "very-secure-password" }),
    }));
  });

  it("shows registration API errors instead of reporting a false success", async () => {
    const fetch = vi.fn(async (url) => {
      if (url === "/api/auth/me") {
        return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, 401);
      }
      if (url === "/api/auth/csrf") return csrfResponse();
      if (url === "/api/auth/register") {
        return jsonResponse({ error: { code: "EMAIL_IN_USE", message: "An account already uses this email" } }, 409);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    renderAuthRoute("/register", <Route path="/register" element={<RegisterPage />} />);
    fireEvent.change(await screen.findByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("An account already uses this email");
    expect(screen.queryByRole("heading", { name: "Account created" })).not.toBeInTheDocument();
  });
});

describe("logout session state", () => {
  function renderProtectedApp(logoutStatus) {
    const fetch = vi.fn(async (url) => {
      if (url === "/api/auth/me") {
        return jsonResponse({ data: { id: "user-1", email: "person@example.com" } });
      }
      if (url === "/api/auth/csrf") return csrfResponse();
      if (url === "/api/auth/logout") {
        return logoutStatus === 204
          ? new Response(null, { status: 204 })
          : jsonResponse({ error: { code: "INTERNAL_ERROR", message: "Logout failed" } }, logoutStatus);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetch);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<h1>Sign in</h1>} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<h1>Dashboard</h1>} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it("keeps the user signed in when logout fails so they can retry", async () => {
    renderProtectedApp(500);
    expect(await screen.findByText("person@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not end the session");
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("person@example.com")).toBeInTheDocument();
  });

  it("clears auth state and navigates to login after logout succeeds", async () => {
    renderProtectedApp(204);
    expect(await screen.findByText("person@example.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("person@example.com")).not.toBeInTheDocument());
  });
});
