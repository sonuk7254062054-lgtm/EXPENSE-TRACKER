import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionTable } from "./TransactionTable.jsx";

describe("TransactionTable", () => {
  it("renders UTC calendar dates and empty results", () => {
    render(
      <TransactionTable
        transactions={[{
          _id: "transaction-1",
          type: "expense",
          amountMinor: 123,
          currency: "JPY",
          category: "travel",
          transactionDate: "2026-10-10T00:00:00.000Z",
        }]}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(screen.getByText("2026-10-10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit travel transaction" })).toBeInTheDocument();
  });

  it("shows a helpful message when the current filters have no matches", () => {
    render(<TransactionTable transactions={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("heading", { name: "No transactions found" })).toBeInTheDocument();
  });
});
