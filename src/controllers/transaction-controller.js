import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from "../services/transaction-service.js";

export async function create(req, res) {
  const transaction = await createTransaction(
    req.auth.userId,
    req.validated.body,
  );
  return res.status(201).json({ data: transaction });
}

export async function list(req, res) {
  const result = await listTransactions(req.auth.userId, req.validated.query);
  return res.status(200).json(result);
}

export async function getOne(req, res) {
  const transaction = await getTransaction(
    req.auth.userId,
    req.validated.params.id,
  );
  return res.status(200).json({ data: transaction });
}

export async function update(req, res) {
  const transaction = await updateTransaction(
    req.auth.userId,
    req.validated.params.id,
    req.validated.body,
  );
  return res.status(200).json({ data: transaction });
}

export async function remove(req, res) {
  await deleteTransaction(req.auth.userId, req.validated.params.id);
  return res.status(204).end();
}
