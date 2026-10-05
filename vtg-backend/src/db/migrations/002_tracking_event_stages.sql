-- VTG Phase 10: classify shipment tracking events by operational stage.
-- Existing events remain logistics milestones unless explicitly reclassified.
ALTER TABLE tracking_events
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'logistics';

ALTER TABLE tracking_events
  DROP CONSTRAINT IF EXISTS tracking_events_stage_check;

ALTER TABLE tracking_events
  ADD CONSTRAINT tracking_events_stage_check
  CHECK (stage IN ('finance','logistics','customs','inspection','delivery'));

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_stage
  ON tracking_events(shipment_id, stage, sort_order);
