-- Add missing vendor capture fields: address, service_area, service_type_codes
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_area TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS service_type_codes TEXT[];
