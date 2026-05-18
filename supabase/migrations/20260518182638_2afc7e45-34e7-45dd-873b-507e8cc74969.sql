
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('gostei', 'nao_gostei')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view responses"
  ON public.survey_responses FOR SELECT
  USING (true);

CREATE POLICY "Anyone can delete responses"
  ON public.survey_responses FOR DELETE
  USING (true);

CREATE INDEX idx_survey_responses_created_at ON public.survey_responses(created_at DESC);
