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
    id: "item-1",
    description: "Monthly Fee",
    quantity: 1,
    unitPrice: 500,
    lineTotal: 500,
    taxRate: 0.07,
    taxAmount: 35,
  },
  {
    id: "item-2",
    description: "Activity Fee",
    quantity: 2,
    unitPrice: 25.5,
    lineTotal: 51,
    taxRate: 0.07,
    taxAmount: 3.57,
  },
];

const totals = calculateInvoiceTotal(items, 0.07);
const invoice: Invoice = {
  id: "invoice-1",
  invoiceNumber: "INV-001",
  invoiceDate: new Date(),
  items,
  totalAmount: totals.total,
  totalTax: totals.totalTax,
  outstandingAmount: totals.total,
  status: InvoiceStatus.UNPAID,
};

const firstPayment = processPayment(invoice, 300, PaymentMethod.CASH);
const firstReceipt = generateReceipt(firstPayment.payment, firstPayment.invoice);

const secondPayment = processPayment(
  firstPayment.invoice,
  300,
  PaymentMethod.BANK_TRANSFER,
);
const secondReceipt = generateReceipt(secondPayment.payment, secondPayment.invoice);

console.log("Invoice totals:", totals);
console.log("First receipt:", firstReceipt);
console.log("Second receipt:", secondReceipt);
console.log("Final invoice status:", secondPayment.invoice.status);
console.log("Final balance:", secondPayment.invoice.outstandingAmount);
