-- role: professor | student | admin
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'professor'
    CHECK (role IN ('professor', 'student', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
