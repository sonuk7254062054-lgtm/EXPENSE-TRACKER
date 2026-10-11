import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "./TransactionForm.jsx";

describe("TransactionForm", () => {
  it("validates locally and submits amount in minor units", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm onSubmit={onSubmit} busy={false} />);

    await user.type(screen.getByLabelText("Amount"), "12.34");
    await user.type(screen.getByLabelText("Category"), "coffee");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      amountMinor: 1234,
      category: "coffee",
      currency: "USD",
    }));
  });

  it("shows an accessible error for invalid amounts", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TransactionForm onSubmit={onSubmit} busy={false} />);
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.type(screen.getByLabelText("Category"), "coffee");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount greater than zero");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("converts zero-decimal and three-decimal currencies to minor units", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TransactionForm onSubmit={onSubmit} busy={false} />);

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "123");
    await user.clear(screen.getByLabelText("Currency code"));
    await user.type(screen.getByLabelText("Currency code"), "JPY");
    await user.type(screen.getByLabelText("Category"), "travel");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 123, currency: "JPY" }));
  });
});
