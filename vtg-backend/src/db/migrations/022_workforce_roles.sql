-- Extend the existing VTG identity model for internal workforce roles.
-- These roles are provisioned by authorised administrators; this migration does not
-- create accounts or grant access by itself.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'logistics';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inspector';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'marketing';
