-- ============================================================================
-- Migration 022: Payment Processing Schema (Stripe Integration)
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Extends the fin schema with Stripe-based payment processing tables
--          including tokenized payment methods, payment intents, refunds,
--          payouts to business owners, and webhook event deduplication.
--          No raw card data is ever stored -- only Stripe PM tokens.
--
-- Dependencies:
--   - 013_finance_schema.sql (fin schema, fin.set_updated_at trigger fn)
-- ============================================================================

BEGIN;

-- Payment Methods (tokenized, no raw card data ever stored)
CREATE TABLE fin.fin_payment_method (
  payment_method_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(20) NOT NULL DEFAULT 'stripe', -- stripe, apple_pay, google_pay
  provider_method_id VARCHAR(255) NOT NULL, -- Stripe PaymentMethod ID (pm_xxx)
  type VARCHAR(30) NOT NULL, -- card, apple_pay, google_pay, bank_account
  brand VARCHAR(30), -- visa, mastercard, amex
  last_four VARCHAR(4),
  exp_month INT,
  exp_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, removed
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payment_method_user ON fin.fin_payment_method(user_id);
CREATE UNIQUE INDEX idx_payment_method_default ON fin.fin_payment_method(user_id) WHERE is_default = TRUE;

-- Payment Intents (Stripe PaymentIntent tracking)
CREATE TABLE fin.fin_payment_intent (
  intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider_intent_id VARCHAR(255), -- Stripe PaymentIntent ID (pi_xxx)
  order_id UUID, -- links to commerce.commerce_order
  reservation_id UUID, -- links to commerce.commerce_reservation
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(30) NOT NULL DEFAULT 'created', -- created, requires_payment_method, requires_confirmation, requires_action, processing, succeeded, failed, cancelled
  payment_method_id UUID REFERENCES fin.fin_payment_method(payment_method_id),
  client_secret VARCHAR(500), -- Stripe client_secret for frontend confirmation
  capture_method VARCHAR(20) DEFAULT 'automatic', -- automatic, manual
  error_code VARCHAR(100),
  error_message TEXT,
  receipt_url TEXT,
  refunded_amount_cents INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_intent_user ON fin.fin_payment_intent(user_id);
CREATE INDEX idx_intent_order ON fin.fin_payment_intent(order_id);
CREATE INDEX idx_intent_provider ON fin.fin_payment_intent(provider_intent_id);

-- Refunds (Stripe Refund tracking)
CREATE TABLE fin.fin_refund (
  refund_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id UUID NOT NULL REFERENCES fin.fin_payment_intent(intent_id),
  provider_refund_id VARCHAR(255), -- Stripe Refund ID (re_xxx)
  amount_cents INT NOT NULL,
  reason VARCHAR(50), -- requested_by_customer, duplicate, fraudulent
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refund_intent ON fin.fin_refund(intent_id);

-- Payouts (to business owners / suppliers)
CREATE TABLE fin.fin_payout_stripe (
  payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- business owner
  provider_payout_id VARCHAR(255), -- Stripe Transfer/Payout ID
  amount_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  destination_type VARCHAR(30), -- bank_account, stripe_connect
  destination_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, in_transit, paid, failed, cancelled
  arrival_date DATE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payout_stripe_user ON fin.fin_payout_stripe(user_id);

-- Webhook Events (Stripe webhook deduplication)
CREATE TABLE fin.fin_webhook_event (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_event_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe event ID (evt_xxx)
  event_type VARCHAR(100) NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  payload JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_webhook_provider ON fin.fin_webhook_event(provider_event_id);

-- Triggers
CREATE TRIGGER set_payment_method_updated_at BEFORE UPDATE ON fin.fin_payment_method FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();
CREATE TRIGGER set_payment_intent_updated_at BEFORE UPDATE ON fin.fin_payment_intent FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();
CREATE TRIGGER set_refund_updated_at BEFORE UPDATE ON fin.fin_refund FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();
CREATE TRIGGER set_payout_stripe_updated_at BEFORE UPDATE ON fin.fin_payout_stripe FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

COMMIT;
