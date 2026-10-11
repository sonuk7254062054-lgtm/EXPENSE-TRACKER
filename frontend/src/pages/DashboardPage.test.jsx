import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({
  summary: vi.fn(),
  monthly: vi.fn(),
  categories: vi.fn(),
}));

vi.mock("../api/client.js", () => ({ api }));

import { DashboardPage } from "./DashboardPage.jsx";

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.summary.mockResolvedValue({
    data: { currency: "USD", incomeMinor: 12345, expenseMinor: 4500, netMinor: 7845 },
  });
  api.monthly.mockResolvedValue({
    data: [{ month: "2026-10", incomeMinor: 12345, expenseMinor: 4500 }],
  });
  api.categories.mockResolvedValue({
    data: [{ category: "Food", expenseMinor: 4500 }],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DashboardPage API integration", () => {
  it("renders summary, monthly and category data returned by the report APIs", async () => {
    renderPage();

    await screen.findByText("$123.45");
    const summaryCards = screen.getByText("Income", { selector: ".summary-label" })
      .closest(".summary-grid");
    expect(within(summaryCards).getByText("$123.45")).toBeInTheDocument();
    expect(within(summaryCards).getByText("$45.00")).toBeInTheDocument();
    expect(within(summaryCards).getByText("$78.45")).toBeInTheDocument();
    expect(screen.getByText("2026-10")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(api.summary).toHaveBeenCalledWith(expect.objectContaining({
      currency: "USD",
      from: expect.stringMatching(/^\d{4}-\d{2}-01$/),
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }));
    expect(api.monthly).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD" }));
    expect(api.categories).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD" }));
  });

  it("shows loading and API failure states, and an empty report result", async () => {
    let finishSummary;
    api.monthly.mockResolvedValueOnce({ data: [] });
    api.categories.mockResolvedValueOnce({ data: [] });
    api.summary.mockReturnValueOnce(new Promise((resolve) => {
      finishSummary = resolve;
    }));
    renderPage();

    expect(screen.getByRole("status")).toHaveTextContent("Loading your reports");
    finishSummary({
      data: { currency: "USD", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
    });
    expect(await screen.findByText("No monthly activity for this range.")).toBeInTheDocument();
    expect(screen.getByText("No expenses for this range.")).toBeInTheDocument();

    cleanup();
    api.summary.mockRejectedValueOnce(new Error("Reports unavailable"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Reports unavailable");
  });

  it("rejects a reversed date range before making a report request", async () => {
    renderPage();
    await screen.findByText("$123.45");
    const reportCallCount = api.summary.mock.calls.length;

    fireEvent.change(screen.getByLabelText("Report start date"), {
      target: { value: "2026-11-01" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The start date must be on or before the end date.",
    );
    expect(api.summary).toHaveBeenCalledTimes(reportCallCount);
  });
});
