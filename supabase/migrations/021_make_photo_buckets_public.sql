-- client-photos and encampment-photos were both created with public=false,
-- but the app displays photos via plain <img>/<Image> tags using
-- getPublicUrl(), which only works against a public bucket — a private
-- bucket rejects unauthenticated image requests, showing a broken-image
-- icon instead of the photo. Filenames are random (timestamp + random
-- string), so making the bucket public doesn't expose a browsable
-- directory, just direct-link viewing for URLs the app already generates.

UPDATE storage.buckets SET public = true WHERE id IN ('client-photos', 'encampment-photos');
