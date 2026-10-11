import { Transaction } from "../models/transaction.js";
import mongoose from "mongoose";

function createMatch(userId, { currency, from, to }) {
  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    currency,
  };

  if (from || to) {
    match.transactionDate = {};
    if (from) {
      match.transactionDate.$gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      const upperBound = new Date(`${to}T00:00:00.000Z`);
      upperBound.setUTCDate(upperBound.getUTCDate() + 1);
      match.transactionDate.$lt = upperBound;
    }
  }

  return match;
}

export async function getSummary(userId, filters) {
  const [summary] = await Transaction.aggregate([
    { $match: createMatch(userId, filters) },
    {
      $group: {
        _id: null,
        incomeMinor: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amountMinor", 0],
          },
        },
        expenseMinor: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amountMinor", 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        incomeMinor: 1,
        expenseMinor: 1,
        netMinor: { $subtract: ["$incomeMinor", "$expenseMinor"] },
      },
    },
  ]);

  return {
    currency: filters.currency,
    range: { from: filters.from ?? null, to: filters.to ?? null },
    incomeMinor: summary?.incomeMinor ?? 0,
    expenseMinor: summary?.expenseMinor ?? 0,
    netMinor: summary?.netMinor ?? 0,
  };
}

function fillMissingMonths(months, from, to) {
  if (!from || !to) return months;

  const byMonth = new Map(months.map((month) => [month.month, month]));
  const result = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00.000Z`);
  const finalMonth = to.slice(0, 7);

  while (cursor.toISOString().slice(0, 7) <= finalMonth) {
    const month = cursor.toISOString().slice(0, 7);
    result.push(byMonth.get(month) ?? {
      month,
      incomeMinor: 0,
      expenseMinor: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}

export async function getMonthlyTotals(userId, filters) {
  const months = await Transaction.aggregate([
    { $match: createMatch(userId, filters) },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: "$transactionDate",
            timezone: "UTC",
          },
        },
        incomeMinor: {
          $sum: {
            $cond: [{ $eq: ["$type", "income"] }, "$amountMinor", 0],
          },
        },
        expenseMinor: {
          $sum: {
            $cond: [{ $eq: ["$type", "expense"] }, "$amountMinor", 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: "$_id",
        incomeMinor: 1,
        expenseMinor: 1,
      },
    },
  ]);

  return fillMissingMonths(months, filters.from, filters.to);
}

export async function getCategoryExpenses(userId, filters) {
  return Transaction.aggregate([
    {
      $match: {
        ...createMatch(userId, filters),
        type: "expense",
      },
    },
    {
      $group: {
        _id: "$category",
        expenseMinor: { $sum: "$amountMinor" },
      },
    },
    { $sort: { expenseMinor: -1, _id: 1 } },
    {
      $project: {
        _id: 0,
        category: "$_id",
        expenseMinor: 1,
      },
    },
  ]);
}
