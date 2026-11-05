-- Shared workforce task, handoff and approval records.
-- All writes are authenticated and permission-checked by /api/workforce.
CREATE TABLE IF NOT EXISTS workforce_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  description TEXT,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','blocked','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  due_at TIMESTAMPTZ,
  assigned_to UUID NOT NULL REFERENCES users(id),
  assigned_by UUID NOT NULL REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workforce_tasks_assigned_status_idx ON workforce_tasks(assigned_to,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS workforce_tasks_due_idx ON workforce_tasks(due_at) WHERE status NOT IN ('completed','cancelled');

CREATE TABLE IF NOT EXISTS workforce_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workforce_tasks(id) ON DELETE SET NULL,
  reference TEXT,
  note TEXT NOT NULL CHECK (length(trim(note)) BETWEEN 3 AND 2000),
  from_user UUID NOT NULL REFERENCES users(id),
  to_user UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS workforce_handoffs_to_status_idx ON workforce_handoffs(to_user,status,created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_handoffs_from_idx ON workforce_handoffs(from_user,created_at DESC);

CREATE TABLE IF NOT EXISTS workforce_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES workforce_tasks(id) ON DELETE SET NULL,
  reference TEXT,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  details TEXT,
  requested_by UUID NOT NULL REFERENCES users(id),
  assigned_reviewer UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  decision_note TEXT,
  decided_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS workforce_approvals_reviewer_status_idx ON workforce_approvals(assigned_reviewer,status,created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_approvals_requester_idx ON workforce_approvals(requested_by,created_at DESC);
