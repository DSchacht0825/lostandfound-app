-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create sequence for client_id (MUST be before persons table)
CREATE SEQUENCE IF NOT EXISTS person_id_seq START 1;

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'field_worker')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create persons table (by-name list)
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id TEXT UNIQUE NOT NULL DEFAULT 'CL-' || LPAD(nextval('person_id_seq')::TEXT, 6, '0'),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  race TEXT NOT NULL,
  ethnicity TEXT NOT NULL,
  veteran_status BOOLEAN NOT NULL DEFAULT FALSE,
  disability_status BOOLEAN NOT NULL DEFAULT FALSE,
  disability_type TEXT,
  chronic_homeless BOOLEAN NOT NULL DEFAULT FALSE,
  living_situation TEXT NOT NULL,
  length_of_time_homeless TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  case_manager TEXT,
  referral_source TEXT,
  preferred_language TEXT,
  cultural_lived_experience TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create encounters table (service interactions)
CREATE TABLE public.encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  service_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  outreach_location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  outreach_worker TEXT NOT NULL,
  referral_source TEXT,
  language_preference TEXT,
  cultural_notes TEXT,
  co_occurring_mh_sud BOOLEAN NOT NULL DEFAULT FALSE,
  co_occurring_type TEXT,
  mat_referral BOOLEAN NOT NULL DEFAULT FALSE,
  mat_type TEXT,
  mat_provider TEXT,
  detox_referral BOOLEAN NOT NULL DEFAULT FALSE,
  detox_provider TEXT,
  naloxone_distributed BOOLEAN NOT NULL DEFAULT FALSE,
  naloxone_date DATE,
  fentanyl_test_strips_count INTEGER,
  harm_reduction_education BOOLEAN NOT NULL DEFAULT FALSE,
  transportation_provided BOOLEAN NOT NULL DEFAULT FALSE,
  shower_trailer BOOLEAN NOT NULL DEFAULT FALSE,
  other_services TEXT,
  case_management_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_persons_first_name_trgm ON public.persons USING gin (first_name gin_trgm_ops);
CREATE INDEX idx_persons_last_name_trgm ON public.persons USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_persons_nickname_trgm ON public.persons USING gin (nickname gin_trgm_ops);
CREATE INDEX idx_persons_client_id ON public.persons(client_id);
CREATE INDEX idx_persons_dob ON public.persons(date_of_birth);
CREATE INDEX idx_encounters_person_id ON public.encounters(person_id);
CREATE INDEX idx_encounters_service_date ON public.encounters(service_date DESC);
CREATE INDEX idx_encounters_location ON public.encounters(latitude, longitude);
CREATE INDEX idx_encounters_outreach_worker ON public.encounters(outreach_worker);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON public.encounters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for persons table
CREATE POLICY "Authenticated users can view all persons"
  ON public.persons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert persons"
  ON public.persons FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update persons"
  ON public.persons FOR UPDATE
  USING (auth.role() = 'authenticated');

-- RLS Policies for encounters table
CREATE POLICY "Authenticated users can view all encounters"
  ON public.encounters FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert encounters"
  ON public.encounters FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update encounters"
  ON public.encounters FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create function for fuzzy person search (for duplicate detection)
CREATE OR REPLACE FUNCTION search_similar_persons(
  search_first_name TEXT,
  search_last_name TEXT,
  search_dob DATE DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  client_id TEXT,
  first_name TEXT,
  last_name TEXT,
  nickname TEXT,
  date_of_birth DATE,
  age INTEGER,
  similarity_score REAL,
  last_encounter_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.client_id,
    p.first_name,
    p.last_name,
    p.nickname,
    p.date_of_birth,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.date_of_birth))::INTEGER as age,
    GREATEST(
      similarity(p.first_name, search_first_name),
      similarity(p.last_name, search_last_name),
      COALESCE(similarity(p.nickname, search_first_name), 0)
    ) as similarity_score,
    (SELECT MAX(e.service_date) FROM public.encounters e WHERE e.person_id = p.id) as last_encounter_date
  FROM public.persons p
  WHERE
    (
      similarity(p.first_name, search_first_name) > similarity_threshold OR
      similarity(p.last_name, search_last_name) > similarity_threshold OR
      similarity(p.nickname, search_first_name) > similarity_threshold
    )
    AND (
      search_dob IS NULL OR
      p.date_of_birth = search_dob
    )
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION search_similar_persons TO authenticated;
