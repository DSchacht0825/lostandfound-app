-- Add new fields to persons table for enhanced intake data collection

-- Add sexual orientation field
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS sexual_orientation TEXT;

-- Add release of information checkbox
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS release_of_information BOOLEAN NOT NULL DEFAULT FALSE;

-- Add domestic violence victim status
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS domestic_violence_victim BOOLEAN NOT NULL DEFAULT FALSE;

-- Add chronic health condition status
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS chronic_health BOOLEAN NOT NULL DEFAULT FALSE;

-- Add mental health condition status
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS mental_health BOOLEAN NOT NULL DEFAULT FALSE;

-- Add addiction type (dropdown: alcohol, cocaine, opioids, meth, fentanyl, inhalants)
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS addiction TEXT
  CHECK (addiction IS NULL OR addiction IN ('alcohol', 'cocaine', 'opioids', 'meth', 'fentanyl', 'inhalants', 'none'));

-- Add evictions count
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS evictions INTEGER DEFAULT 0;

-- Add income field
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS income TEXT;

-- Add support system description
ALTER TABLE public.persons ADD COLUMN IF NOT EXISTS support_system TEXT;

-- Update search_similar_persons function to include new fields in the result
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
