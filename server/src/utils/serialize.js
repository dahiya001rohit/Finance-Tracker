const { fromCents } = require("./money");

function idOf(value) {
  return value?._id?.toString?.() || value?.toString?.() || value || null;
}

function serializeUser(user) {
  if (!user) return null;
  return {
    id: idOf(user),
    name: user.name,
    email: user.email,
    preferred_currency: user.preferredCurrency,
    created_at: user.createdAt
  };
}

function serializeCategory(category) {
  if (!category) return null;
  return {
    id: idOf(category),
    user_id: idOf(category.userId),
    name: category.name,
    kind: category.kind,
    is_deleted: category.isDeleted,
    created_at: category.createdAt
  };
}

function categoryName(transaction) {
  return transaction.categoryId?.name || transaction.categoryName || null;
}

function serializeTransaction(transaction) {
  if (!transaction) return null;
  return {
    id: idOf(transaction),
    user_id: idOf(transaction.userId),
    category_id: idOf(transaction.categoryId),
    kind: transaction.kind,
    amount: fromCents(transaction.amountCents),
    currency: transaction.currency,
    transaction_date: transaction.transactionDate,
    description: transaction.description,
    category_name: categoryName(transaction),
    receipt_url: transaction.receiptUrl || null,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt
  };
}

function serializeBudget(budget, spentCents = 0) {
  if (!budget) return null;
  return {
    id: idOf(budget),
    user_id: idOf(budget.userId),
    category_id: idOf(budget.categoryId),
    category_name: budget.categoryId?.name || budget.categoryName || null,
    amount: fromCents(budget.amountCents),
    currency: budget.currency,
    month: budget.month,
    spent: fromCents(spentCents),
    created_at: budget.createdAt,
    updated_at: budget.updatedAt
  };
}

function serializeReceipt(receipt) {
  if (!receipt) return null;
  return {
    id: idOf(receipt),
    user_id: idOf(receipt.userId),
    transaction_id: idOf(receipt.transactionId),
    original_name: receipt.originalName,
    stored_name: receipt.storedName,
    mime_type: receipt.mimeType,
    size_bytes: receipt.sizeBytes,
    url: receipt.url,
    created_at: receipt.createdAt
  };
}

function serializeNotification(notification) {
  if (!notification) return null;
  return {
    id: idOf(notification),
    user_id: idOf(notification.userId),
    budget_id: idOf(notification.budgetId),
    title: notification.title,
    body: notification.body,
    is_read: notification.isRead,
    sent_at: notification.sentAt,
    created_at: notification.createdAt
  };
}

module.exports = {
  idOf,
  serializeUser,
  serializeCategory,
  serializeTransaction,
  serializeBudget,
  serializeReceipt,
  serializeNotification
};
