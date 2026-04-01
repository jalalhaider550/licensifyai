
CREATE TABLE public.conveyancing_client_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.conveyancing_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  
  -- Step 1: Personal Info
  full_name text NOT NULL DEFAULT '',
  date_of_birth date,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  current_address text NOT NULL DEFAULT '',
  address_postcode text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'United Kingdom',
  
  -- Step 2: Identity (file references)
  id_document_type text NOT NULL DEFAULT '',
  id_document_path text,
  proof_of_address_path text,
  
  -- Step 3: Property
  client_role text NOT NULL DEFAULT 'buyer',
  property_address text NOT NULL DEFAULT '',
  property_postcode text NOT NULL DEFAULT '',
  property_type text NOT NULL DEFAULT 'residential',
  tenure text NOT NULL DEFAULT 'freehold',
  
  -- Step 4: Financial
  transaction_price numeric NOT NULL DEFAULT 0,
  has_mortgage boolean NOT NULL DEFAULT false,
  lender_name text NOT NULL DEFAULT '',
  mortgage_broker text NOT NULL DEFAULT '',
  source_of_funds text NOT NULL DEFAULT '',
  source_of_funds_document_path text,
  first_time_buyer boolean,
  buying_with_another boolean,
  second_buyer_name text NOT NULL DEFAULT '',
  owns_property_fully boolean,
  existing_mortgage boolean,
  existing_lender_name text NOT NULL DEFAULT '',
  property_vacant boolean,
  lease_years_remaining integer,
  ground_rent text NOT NULL DEFAULT '',
  
  -- Step 5: Declaration
  declaration_confirmed boolean NOT NULL DEFAULT false,
  
  -- Meta
  intake_complete boolean NOT NULL DEFAULT false,
  current_step integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conveyancing_client_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own intake" ON public.conveyancing_client_intake
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intake" ON public.conveyancing_client_intake
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intake" ON public.conveyancing_client_intake
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own intake" ON public.conveyancing_client_intake
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
