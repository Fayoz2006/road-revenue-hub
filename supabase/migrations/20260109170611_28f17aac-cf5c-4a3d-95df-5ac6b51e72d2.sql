-- Create prebook_notes table for task list calendar
CREATE TABLE public.prebook_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.prebook_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own prebook notes" 
ON public.prebook_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prebook notes" 
ON public.prebook_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prebook notes" 
ON public.prebook_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prebook notes" 
ON public.prebook_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_prebook_notes_updated_at
BEFORE UPDATE ON public.prebook_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();