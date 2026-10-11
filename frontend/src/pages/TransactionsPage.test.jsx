import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({
  transactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("../api/client.js", () => ({ api }));

import { TransactionsPage } from "./TransactionsPage.jsx";

const item = {
  _id: "507f1f77bcf86cd799439011",
  type: "expense",
  amountMinor: 1234,
  currency: "USD",
  category: "Food",
  description: "Coffee",
  merchant: "Cafe",
  transactionDate: "2026-10-10T00:00:00.000Z",
};

function result(data = [item], page = 1, pages = 1) {
  return {
    data,
    pagination: { page, limit: 10, total: data.length, pages },
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.transactions.mockResolvedValue(result());
  api.createTransaction.mockResolvedValue({ data: item });
  api.updateTransaction.mockResolvedValue({ data: item });
  api.deleteTransaction.mockResolvedValue(null);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TransactionsPage API integration", () => {
  it("loads server results and sends search, filters, sort, and page through the API client", async () => {
    const user = userEvent.setup();
    api.transactions.mockResolvedValue(result([item], 1, 2));
    renderPage();

    expect(await screen.findByText("Cafe")).toBeInTheDocument();
    expect(api.transactions).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      limit: 10,
      order: "desc",
      sort: "transactionDate",
    }));

    await user.type(screen.getByRole("searchbox", { name: "Search" }), "coffee");
    await waitFor(() => expect(api.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "coffee", page: 1 }),
    ));

    await user.selectOptions(screen.getByRole("combobox", { name: "Type" }), "expense");
    await waitFor(() => expect(api.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "coffee", type: "expense", page: 1 }),
    ));

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "amountMinor");
    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "asc");
    await waitFor(() => expect(api.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "amountMinor", order: "asc" }),
    ));

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(api.transactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, q: "coffee", type: "expense" }),
    ));
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("creates and updates records, showing success feedback after API success", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Cafe");

    await user.click(screen.getByRole("button", { name: "＋ Add transaction" }));
    await user.type(screen.getByRole("spinbutton", { name: "Amount" }), "42.50");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Travel");
    await user.click(screen.getByRole("button", { name: "Add transaction", exact: true }));

    await screen.findByText("Transaction added.");
    expect(api.createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amountMinor: 4250,
      category: "Travel",
      currency: "USD",
      type: "expense",
    }));

    await user.click(screen.getByRole("button", { name: "Edit Food transaction" }));
    const amount = screen.getByRole("spinbutton", { name: "Amount" });
    await user.clear(amount);
    await user.type(amount, "20.00");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText("Transaction updated.");
    expect(api.updateTransaction).toHaveBeenCalledWith(item._id, expect.objectContaining({
      amountMinor: 2000,
      category: "Food",
    }));

    await user.click(screen.getByRole("button", { name: "Delete Food transaction" }));
    await screen.findByText("Transaction deleted.");
    expect(window.confirm).toHaveBeenCalled();
    expect(api.deleteTransaction).toHaveBeenCalledWith(item._id);
    expect(api.transactions).toHaveBeenCalledTimes(4);
  });

  it("shows server errors, stops loading, and renders a helpful empty state", async () => {
    api.transactions.mockRejectedValueOnce(new Error("Service temporarily unavailable"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Service temporarily unavailable");
    expect(screen.queryByRole("status", { name: "Loading transactions…" })).not.toBeInTheDocument();

    cleanup();
    api.transactions.mockResolvedValueOnce(result([], 1, 0));
    renderPage();
    expect(await screen.findByRole("heading", { name: "No transactions found" })).toBeInTheDocument();
    expect(screen.getByText("0 transactions")).toBeInTheDocument();
  });
});
