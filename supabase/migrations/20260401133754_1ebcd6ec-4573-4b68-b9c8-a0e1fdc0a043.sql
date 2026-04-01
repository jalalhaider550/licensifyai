-- Add new case types to the enum
ALTER TYPE public.case_type ADD VALUE IF NOT EXISTS 'litigation';
ALTER TYPE public.case_type ADD VALUE IF NOT EXISTS 'conveyancing';
ALTER TYPE public.case_type ADD VALUE IF NOT EXISTS 'advisory';

-- Add matter-specific metadata, risks, and deadlines columns
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS risks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deadlines jsonb NOT NULL DEFAULT '[]'::jsonb;