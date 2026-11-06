export enum InvoiceStatus {
  UNPAID = "unpaid",
  PARTIALLY_PAID = "partially_paid",
  PAID = "paid",
  OVERPAID = "overpaid",
}

export enum PaymentMethod {
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
}

export enum PaymentStatus {
  COMPLETED = "completed",
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
}

export interface PaymentAllocation {
  invoiceItemId: string;
  description: string;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentDate: Date;
  referenceNumber: string;
  status: PaymentStatus;
  allocations: PaymentAllocation[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  items: InvoiceItem[];
  totalAmount: number;
  totalTax: number;
  outstandingAmount: number;
  status: InvoiceStatus;
  payments?: Payment[];
}

export interface ReceiptItem {
  invoiceItemId: string;
  description: string;
  amountPaid: number;
}

export interface Receipt {
  id: string;
  paymentId: string;
  receiptNumber: string;
  receiptDate: Date;
  totalPaid: number;
  remainingBalance: number;
  items: ReceiptItem[];
}

export interface InvoiceTotals {
  subtotal: number;
  totalTax: number;
  total: number;
}

export interface PaymentResult {
  invoice: Invoice;
  payment: Payment;
}
