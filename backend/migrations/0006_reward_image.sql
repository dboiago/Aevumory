-- Optional reward image (2026-10-20): a reference to an image shown on the
-- reward card — an uploaded file served from /uploads/... or a URL/data
-- reference. Purely presentational; no accounting semantics.
ALTER TABLE rewards ADD COLUMN image_ref TEXT;
