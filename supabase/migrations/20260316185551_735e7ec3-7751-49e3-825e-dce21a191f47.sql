
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table (law firm workspace)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_name TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, firm_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'firm_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'UK',
  registration_number TEXT,
  incorporation_date DATE,
  registered_address TEXT,
  services TEXT[] DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Directors
CREATE TABLE public.directors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Director',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.directors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage directors via client" ON public.directors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = directors.client_id AND clients.user_id = auth.uid())
  );

-- Shareholders
CREATE TABLE public.shareholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage shareholders via client" ON public.shareholders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = shareholders.client_id AND clients.user_id = auth.uid())
  );

-- Documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT,
  storage_path TEXT,
  ai_status TEXT DEFAULT 'pending' CHECK (ai_status IN ('pending', 'processing', 'verified', 'generated')),
  extracted_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- License applications
CREATE TABLE public.license_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  regulatory_authority TEXT NOT NULL,
  readiness_score INTEGER DEFAULT 0 CHECK (readiness_score >= 0 AND readiness_score <= 100),
  status TEXT NOT NULL DEFAULT 'data_collection' CHECK (status IN ('data_collection', 'in_progress', 'ready_to_submit', 'submitted')),
  missing_documents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.license_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own applications" ON public.license_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON public.license_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.license_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.license_applications FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_license_applications_updated_at BEFORE UPDATE ON public.license_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Document storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Users can view own docs storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own docs storage" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own docs storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
