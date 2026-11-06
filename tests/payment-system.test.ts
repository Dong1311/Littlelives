import { describe, expect, it } from "vitest";

import {
  InvoiceStatus,
  PaymentMethod,
  calculateInvoiceTotal,
  generateReceipt,
  processPayment,
  type Invoice,
  type InvoiceItem,
} from "../src/index.js";

const items: InvoiceItem[] = [
  {
    id: "monthly-fee",
    description: "Monthly Fee",
    quantity: 1,
    unitPrice: 500,
    lineTotal: 500,
    taxRate: 0.07,
    taxAmount: 35,
  },
  {
    id: "activity-fee",
    description: "Activity Fee",
    quantity: 2,
    unitPrice: 25.5,
    lineTotal: 51,
    taxRate: 0.07,
    taxAmount: 3.57,
  },
];

function makeInvoice(): Invoice {
  return {
    id: "invoice-1",
    invoiceNumber: "INV-001",
    invoiceDate: new Date("2026-11-06T00:00:00.000Z"),
    items,
    totalAmount: 589.57,
    totalTax: 38.57,
    outstandingAmount: 589.57,
    status: InvoiceStatus.UNPAID,
  };
}

describe("calculateInvoiceTotal", () => {
  it("calculates the example invoice with 7% GST", () => {
    expect(calculateInvoiceTotal(items, 0.07)).toEqual({
      subtotal: 551,
      totalTax: 38.57,
      total: 589.57,
    });
  });

  it("handles a zero-amount invoice", () => {
    expect(calculateInvoiceTotal([], 0.07)).toEqual({
      subtotal: 0,
      totalTax: 0,
      total: 0,
    });
  });

  it("rejects negative amounts", () => {
    const invalidItem = { ...items[0]!, unitPrice: -1 };
    expect(() => calculateInvoiceTotal([invalidItem], 0.07)).toThrow(
      "must be a non-negative finite number",
    );
  });

  it("rejects invalid tax rates and unsafe large amounts", () => {
    expect(() => calculateInvoiceTotal(items, -0.01)).toThrow(
      "Tax rate must be between 0 and 1",
    );
    expect(() =>
      calculateInvoiceTotal([{ ...items[0]!, unitPrice: Number.MAX_VALUE }], 0.07),
    ).toThrow();
  });
});

describe("processPayment", () => {
  it("handles a partial payment and does not mutate the input invoice", () => {
    const original = makeInvoice();
    const result = processPayment(original, 300, PaymentMethod.CASH);

    expect(result.invoice.outstandingAmount).toBe(289.57);
    expect(result.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
    expect(result.payment.amount).toBe(300);
    expect(result.payment.paymentMethod).toBe(PaymentMethod.CASH);
    expect(original.outstandingAmount).toBe(589.57);
  });

  it("handles multiple payments and overpayment", () => {
    const first = processPayment(makeInvoice(), 300, PaymentMethod.CASH);
    const second = processPayment(
      first.invoice,
      300,
      PaymentMethod.BANK_TRANSFER,
    );

    expect(second.invoice.outstandingAmount).toBe(-10.43);
    expect(second.invoice.status).toBe(InvoiceStatus.OVERPAID);
    expect(second.invoice.payments).toHaveLength(2);
    expect(second.payment.allocations).toEqual([
      {
        invoiceItemId: "monthly-fee",
        description: "Monthly Fee",
        amount: 235,
      },
      {
        invoiceItemId: "activity-fee",
        description: "Activity Fee",
        amount: 54.57,
      },
    ]);
  });

  it("handles the payment scenario from the requirements", () => {
    const invoice: Invoice = {
      ...makeInvoice(),
      items: [
        {
          id: "fee",
          description: "Fee",
          quantity: 1,
          unitPrice: 1000,
          lineTotal: 1000,
          taxRate: 0,
          taxAmount: 0,
        },
      ],
      totalAmount: 1000,
      totalTax: 0,
      outstandingAmount: 1000,
    };

    const first = processPayment(invoice, 300, PaymentMethod.CASH);
    const second = processPayment(
      first.invoice,
      750,
      PaymentMethod.BANK_TRANSFER,
    );

    expect(first.invoice.outstandingAmount).toBe(700);
    expect(second.invoice.outstandingAmount).toBe(-50);
    expect(second.invoice.status).toBe(InvoiceStatus.OVERPAID);
  });

  it("marks an exactly paid invoice as paid", () => {
    const result = processPayment(
      makeInvoice(),
      589.57,
      PaymentMethod.BANK_TRANSFER,
    );

    expect(result.invoice.outstandingAmount).toBe(0);
    expect(result.invoice.status).toBe(InvoiceStatus.PAID);
  });

  it("rejects zero, negative, and additional payments on settled invoices", () => {
    expect(() => processPayment(makeInvoice(), 0, PaymentMethod.CASH)).toThrow(
      "Payment amount must be greater than zero",
    );
    expect(() => processPayment(makeInvoice(), -10, PaymentMethod.CASH)).toThrow();

    const paid = processPayment(makeInvoice(), 589.57, PaymentMethod.CASH);
    expect(() => processPayment(paid.invoice, 1, PaymentMethod.CASH)).toThrow(
      "Invoice is already fully paid",
    );
  });
});

describe("generateReceipt", () => {
  it("creates a receipt with allocations and remaining balance", () => {
    const result = processPayment(makeInvoice(), 300, PaymentMethod.CASH);
    const receipt = generateReceipt(result.payment, result.invoice);

    expect(receipt.paymentId).toBe(result.payment.id);
    expect(receipt.totalPaid).toBe(300);
    expect(receipt.remainingBalance).toBe(289.57);
    expect(receipt.items).toEqual([
      {
        invoiceItemId: "monthly-fee",
        description: "Monthly Fee",
        amountPaid: 300,
      },
    ]);
  });

  it("rejects a payment from another invoice", () => {
    const result = processPayment(makeInvoice(), 100, PaymentMethod.CASH);
    expect(() =>
      generateReceipt(result.payment, { ...result.invoice, id: "invoice-2" }),
    ).toThrow("Payment does not belong to this invoice");
  });
});
