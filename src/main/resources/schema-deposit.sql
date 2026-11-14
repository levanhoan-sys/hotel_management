-- Hibernate ddl-auto:update adds the new nullable booking_id and payment_type columns.
-- Existing installations may still have invoice_id NOT NULL from the invoice-only payment model.
-- This change is repeatable and preserves all historical invoice payments.
ALTER TABLE payments MODIFY COLUMN invoice_id BIGINT NULL;
-- Unpaid/reported deposits do not have a successful payment timestamp yet.
ALTER TABLE payments MODIFY COLUMN paid_at DATETIME(6) NULL;
