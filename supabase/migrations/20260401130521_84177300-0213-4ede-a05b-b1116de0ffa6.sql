
ALTER TABLE public.conveyancing_client_intake
  ADD COLUMN IF NOT EXISTS ta6_disputes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_planning_works text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_guarantees text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_boundaries text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_rights_of_way text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_notices text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta6_services text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta10_included_items text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta10_excluded_items text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ta10_additional_items text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_of_wealth text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS special_instructions text NOT NULL DEFAULT '';
