import { Transaction } from "../models/transaction.js";
import { HttpError } from "../errors/http-error.js";

function notFound() {
  return new HttpError(404, "TRANSACTION_NOT_FOUND", "Transaction not found");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createTransaction(userId, fields) {
  return Transaction.create({ ...fields, userId });
}

export async function listTransactions(userId, query) {
  const filter = { userId };
  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;
  if (query.currency) filter.currency = query.currency;
  if (query.dateFrom || query.dateTo) {
    filter.transactionDate = {};
    if (query.dateFrom) filter.transactionDate.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    if (query.dateTo) {
      const end = new Date(`${query.dateTo}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      filter.transactionDate.$lt = end;
    }
  }
  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    filter.amountMinor = {};
    if (query.minAmount !== undefined) filter.amountMinor.$gte = query.minAmount;
    if (query.maxAmount !== undefined) filter.amountMinor.$lte = query.maxAmount;
  }
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [
      { category: search },
      { description: search },
      { merchant: search },
    ];
  }

  const direction = query.order === "asc" ? 1 : -1;
  const sort = { [query.sort]: direction, _id: direction };
  const skip = (query.page - 1) * query.limit;
  const [data, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip(skip).limit(query.limit).lean(),
    Transaction.countDocuments(filter),
  ]);
  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export async function getTransaction(userId, id) {
  const transaction = await Transaction.findOne({ _id: id, userId }).lean();
  if (!transaction) throw notFound();
  return transaction;
}

export async function updateTransaction(userId, id, fields) {
  const transaction = await Transaction.findOneAndUpdate(
    { _id: id, userId },
    { $set: fields },
    { new: true, runValidators: true, strict: "throw" },
  ).lean();
  if (!transaction) throw notFound();
  return transaction;
}

export async function deleteTransaction(userId, id) {
  const transaction = await Transaction.findOneAndDelete({ _id: id, userId });
  if (!transaction) throw notFound();
}
