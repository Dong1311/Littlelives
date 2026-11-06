# Payment System

A small Node.js/TypeScript implementation of invoice calculation, payment
processing, and receipt generation.

## Requirements

- Node.js 20 or newer
- npm

## Setup and commands

```bash
npm install
npm test
npm run typecheck
npm run build
npm run example
```

## Core functions

```ts
calculateInvoiceTotal(items, taxRate)
processPayment(invoice, paymentAmount, paymentMethod)
generateReceipt(payment, invoice)
```

`calculateInvoiceTotal` calculates each line as `quantity * unitPrice`, applies
the supplied tax rate, and returns the subtotal, total tax, and final total.

`processPayment` supports cash and bank transfers, partial payments, multiple
payments, and overpayments. It returns a new invoice instead of mutating the
input invoice.

`generateReceipt` records the current payment, its allocation to invoice items,
and the invoice balance after payment.

## Assumptions and design decisions

- Amounts are rounded to two decimal places at each invoice line and tax line.
- Tax rates are decimals, so 7% GST is passed as `0.07`.
- Payments are allocated to invoice items in their listed order.
- Item allocation includes the item's tax.
- Overpayments are allowed. A negative outstanding balance represents credit;
  for example, `-50` means the invoice was overpaid by `50`.
- A receipt's `totalPaid` is the amount of the payment represented by that
  receipt, not the cumulative amount across every receipt.
- A fully paid or overpaid invoice cannot accept an additional payment.
- IDs and reference numbers are generated locally with UUIDs.

## Example calculation

| Item | Calculation | Line total |
| --- | ---: | ---: |
| Monthly Fee | 1 x 500.00 | 500.00 |
| Activity Fee | 2 x 25.50 | 51.00 |

```text
Subtotal: 551.00
GST (7%): 38.57
Total:    589.57
```

See `examples/payment-flow.ts` for a complete partial-payment and overpayment
flow.
