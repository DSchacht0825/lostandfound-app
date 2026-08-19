-- Encampment reports: logged when a field worker is out looking for a
-- specific client, can't locate them, but finds/passes an encampment worth
-- recording (photo, notes, GPS). Not tied to any one client — person_id is
-- optional context ("was looking for this person when I found this site").

CREATE TABLE public.encampments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_description TEXT,
  estimated_population INTEGER,
  photo_url TEXT,
  notes TEXT,
  reported_by TEXT NOT NULL,
  person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cleared')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_encampments_location ON public.encampments(latitude, longitude);
CREATE INDEX idx_encampments_person_id ON public.encampments(person_id);
CREATE INDEX idx_encampments_created_at ON public.encampments(created_at DESC);
CREATE INDEX idx_encampments_status ON public.encampments(status);

CREATE TRIGGER update_encampments_updated_at
  BEFORE UPDATE ON public.encampments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.encampments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all encampments"
  ON public.encampments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert encampments"
  ON public.encampments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update encampments"
  ON public.encampments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Base table grant, not just RLS — see 019_grant_table_privileges.sql for
-- why this is required in addition to the policies above.
GRANT SELECT, INSERT, UPDATE ON public.encampments TO authenticated;

-- Storage bucket for encampment photos, same pattern as client-photos (008)
INSERT INTO storage.buckets (id, name, public)
VALUES ('encampment-photos', 'encampment-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload encampment photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'encampment-photos');

CREATE POLICY "Authenticated users can view encampment photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'encampment-photos');

CREATE POLICY "Authenticated users can update encampment photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'encampment-photos');

CREATE POLICY "Authenticated users can delete encampment photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'encampment-photos');

COMMENT ON TABLE public.encampments IS 'Encampment sightings logged by field workers, independent of any specific client. Shown on the dashboard map in a distinct color from service-interaction points.';
