-- Phase 10: extend order document types for customs and final delivery.
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'customs_declaration';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'duty_assessment';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'customs_release';
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'proof_of_delivery';
