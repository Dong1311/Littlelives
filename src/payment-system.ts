import { randomUUID } from "node:crypto";

import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  type Invoice,
  type InvoiceItem,
  type InvoiceTotals,
  type Payment,
  type PaymentAllocation,
  type PaymentResult,
  type Receipt,
} from "./types.js";

const MONEY_DECIMALS = 100;

// Keep every monetary result at two decimal places and reject unsafe values.
function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Amount must be a finite number");
  }

  const cents = Math.round((value + Number.EPSILON) * MONEY_DECIMALS);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Amount is too large to calculate safely");
  }

  return cents / MONEY_DECIMALS;
}

function validateNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative finite number`);
  }
}

export function calculateInvoiceTotal(
  items: InvoiceItem[],
  taxRate: number,
): InvoiceTotals {
  if (!Array.isArray(items)) {
    throw new Error("Items must be an array");
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error("Tax rate must be between 0 and 1");
  }

  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    validateNonNegative(item.quantity, `Quantity for ${item.description}`);
    validateNonNegative(item.unitPrice, `Unit price for ${item.description}`);

    const lineTotal = roundMoney(item.quantity * item.unitPrice);
    const taxAmount = roundMoney(lineTotal * taxRate);

    subtotal = roundMoney(subtotal + lineTotal);
    totalTax = roundMoney(totalTax + taxAmount);
  }

  return {
    subtotal,
    totalTax,
    total: roundMoney(subtotal + totalTax),
  };
}

function getInvoiceStatus(total: number, outstanding: number): InvoiceStatus {
  if (outstanding < 0) return InvoiceStatus.OVERPAID;
  if (outstanding === 0) return InvoiceStatus.PAID;
  if (outstanding < total) return InvoiceStatus.PARTIALLY_PAID;
  return InvoiceStatus.UNPAID;
}

function allocatePayment(invoice: Invoice, amount: number): PaymentAllocation[] {
  // Allocate payments to invoice items in order, including each item's tax.
  let previouslyPaid = roundMoney(
    Math.max(0, invoice.totalAmount - Math.max(0, invoice.outstandingAmount)),
  );
  let amountToAllocate = roundMoney(
    Math.min(amount, Math.max(0, invoice.outstandingAmount)),
  );
  const allocations: PaymentAllocation[] = [];

  for (const item of invoice.items) {
    const itemTotal = roundMoney(item.lineTotal + item.taxAmount);
    const paidOnThisItem = Math.min(previouslyPaid, itemTotal);
    previouslyPaid = roundMoney(previouslyPaid - paidOnThisItem);

    const remainingOnItem = roundMoney(itemTotal - paidOnThisItem);
    const allocated = roundMoney(Math.min(amountToAllocate, remainingOnItem));

    if (allocated > 0) {
      allocations.push({
        invoiceItemId: item.id,
        description: item.description,
        amount: allocated,
      });
      amountToAllocate = roundMoney(amountToAllocate - allocated);
    }

    if (amountToAllocate === 0) break;
  }

  return allocations;
}

export function processPayment(
  invoice: Invoice,
  paymentAmount: number,
  paymentMethod: PaymentMethod,
): PaymentResult {
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }
  if (!Object.values(PaymentMethod).includes(paymentMethod)) {
    throw new Error("Unsupported payment method");
  }
  validateNonNegative(invoice.totalAmount, "Invoice total");
  if (!Number.isFinite(invoice.outstandingAmount)) {
    throw new Error("Invoice outstanding amount must be finite");
  }
  if (invoice.outstandingAmount <= 0) {
    throw new Error("Invoice is already fully paid");
  }

  const amount = roundMoney(paymentAmount);
  const payment: Payment = {
    id: randomUUID(),
    invoiceId: invoice.id,
    paymentMethod,
    amount,
    paymentDate: new Date(),
    referenceNumber: `PAY-${randomUUID().slice(0, 8).toUpperCase()}`,
    status: PaymentStatus.COMPLETED,
    allocations: allocatePayment(invoice, amount),
  };

  // A negative outstanding amount represents an overpayment (customer credit).
  const outstandingAmount = roundMoney(invoice.outstandingAmount - amount);
  const updatedInvoice: Invoice = {
    ...invoice,
    outstandingAmount,
    status: getInvoiceStatus(invoice.totalAmount, outstandingAmount),
    payments: [...(invoice.payments ?? []), payment],
  };

  return { invoice: updatedInvoice, payment };
}

export function generateReceipt(payment: Payment, invoice: Invoice): Receipt {
  if (payment.invoiceId !== invoice.id) {
    throw new Error("Payment does not belong to this invoice");
  }

  return {
    id: randomUUID(),
    paymentId: payment.id,
    receiptNumber: `RCT-${randomUUID().slice(0, 8).toUpperCase()}`,
    receiptDate: new Date(),
    totalPaid: payment.amount,
    remainingBalance: invoice.outstandingAmount,
    items: payment.allocations.map((allocation) => ({
      invoiceItemId: allocation.invoiceItemId,
      description: allocation.description,
      amountPaid: allocation.amount,
    })),
  };
}
