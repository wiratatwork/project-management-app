-- Per-project counter for auto-generated task codes ({projectCode}-{NNN}).
-- It only ever increments, so deleted task codes are never reused.
ALTER TABLE "Project" ADD COLUMN "nextTaskNumber" INTEGER NOT NULL DEFAULT 1;
