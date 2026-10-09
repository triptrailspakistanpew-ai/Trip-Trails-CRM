/*
  Warnings:

  - You are about to alter the column `costPrice` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `salePrice` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `profit` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `profitMargin` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `DoublePrecision`.
  - You are about to alter the column `amountReceived` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `balance` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `subtotal` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `tax` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `total` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `unitPrice` on the `InvoiceLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `InvoiceLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `debit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `credit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `exchangeRate` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,6)` to `DoublePrecision`.
  - You are about to alter the column `baseDebit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `baseCredit` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `budget` on the `Lead` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `subtotal` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `agencyFee` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `discount` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `taxTotal` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `total` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `estimatedProfit` on the `Quotation` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `costPrice` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `sellingPrice` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `total` on the `QuotationItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `taxValue` on the `QuotationTax` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `taxAmount` on the `QuotationTax` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `Receipt` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `balance` on the `Supplier` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `amount` on the `SupplierPayment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "costPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "salePrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "profit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "profitMargin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "amountReceived" DROP DEFAULT,
ALTER COLUMN "amountReceived" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "balance" DROP DEFAULT,
ALTER COLUMN "balance" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "subtotal" DROP DEFAULT,
ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tax" DROP DEFAULT,
ALTER COLUMN "tax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total" DROP DEFAULT,
ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "InvoiceLine" ALTER COLUMN "unitPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "JournalLine" ALTER COLUMN "debit" DROP DEFAULT,
ALTER COLUMN "debit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "credit" DROP DEFAULT,
ALTER COLUMN "credit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "exchangeRate" DROP DEFAULT,
ALTER COLUMN "exchangeRate" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "baseDebit" DROP DEFAULT,
ALTER COLUMN "baseDebit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "baseCredit" DROP DEFAULT,
ALTER COLUMN "baseCredit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "budget" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Quotation" ALTER COLUMN "subtotal" DROP DEFAULT,
ALTER COLUMN "subtotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "agencyFee" DROP DEFAULT,
ALTER COLUMN "agencyFee" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "discount" DROP DEFAULT,
ALTER COLUMN "discount" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "taxTotal" DROP DEFAULT,
ALTER COLUMN "taxTotal" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total" DROP DEFAULT,
ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "estimatedProfit" DROP DEFAULT,
ALTER COLUMN "estimatedProfit" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "QuotationItem" ALTER COLUMN "costPrice" DROP DEFAULT,
ALTER COLUMN "costPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "sellingPrice" DROP DEFAULT,
ALTER COLUMN "sellingPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "total" DROP DEFAULT,
ALTER COLUMN "total" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "QuotationTax" ALTER COLUMN "taxValue" DROP DEFAULT,
ALTER COLUMN "taxValue" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "taxAmount" DROP DEFAULT,
ALTER COLUMN "taxAmount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Receipt" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "balance" DROP DEFAULT,
ALTER COLUMN "balance" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SupplierPayment" ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;
