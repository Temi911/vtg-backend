-- VTG live vessel / AIS tracking integration
-- Adds provider identifiers without replacing the existing shipment timeline.

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS vessel_name TEXT,
  ADD COLUMN IF NOT EXISTS vessel_imo TEXT,
  ADD COLUMN IF NOT EXISTS vessel_mmsi TEXT,
  ADD COLUMN IF NOT EXISTS voyage_no TEXT,
  ADD COLUMN IF NOT EXISTS tracking_provider TEXT;

CREATE INDEX IF NOT EXISTS idx_shipments_vessel_imo ON shipments(vessel_imo);
CREATE INDEX IF NOT EXISTS idx_shipments_vessel_mmsi ON shipments(vessel_mmsi);
