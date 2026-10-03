-- Phase 9: enforce one active payment request per order and payment method.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_active_order_method
  ON payment_requests(order_id, method)
  WHERE order_id IS NOT NULL AND status IN ('pending','processing');
