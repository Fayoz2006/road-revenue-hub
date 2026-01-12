-- Add truck_number column to drivers table
ALTER TABLE public.drivers ADD COLUMN truck_number TEXT;

-- Create index for faster lookups by truck number
CREATE INDEX idx_drivers_truck_number ON public.drivers(truck_number);