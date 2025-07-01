-- Create call_analysis table to store AI-generated insights from VAPI calls
-- This table will cache sentiment analysis, lead quality, and action points
-- to avoid expensive real-time API calls during analytics calculations

CREATE TABLE call_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vapi_call_id text NOT NULL UNIQUE,
  call_purpose text,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  lead_quality text CHECK (lead_quality IN ('hot', 'warm', 'cold')),
  key_points text[], -- Array of key discussion points
  follow_up_items text[], -- Array of follow-up actions  
  urgent_concerns text[], -- Array of urgent issues
  property_interest text,
  timeline text,
  contact_preference text,
  appointment_requested boolean DEFAULT false,
  analyzed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_call_analysis_user_id ON call_analysis(user_id);
CREATE INDEX idx_call_analysis_vapi_call_id ON call_analysis(vapi_call_id);
CREATE INDEX idx_call_analysis_sentiment ON call_analysis(sentiment);
CREATE INDEX idx_call_analysis_analyzed_at ON call_analysis(analyzed_at);
CREATE INDEX idx_call_analysis_lead_quality ON call_analysis(lead_quality);

-- Enable RLS
ALTER TABLE call_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies so users can only access their own call analysis
CREATE POLICY "Users can view their own call analysis" ON call_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own call analysis" ON call_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call analysis" ON call_analysis  
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_call_analysis_updated_at
  BEFORE UPDATE ON call_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_call_analysis_updated_at();

-- Add comment to the table
COMMENT ON TABLE call_analysis IS 'Stores AI-generated analysis results for VAPI calls including sentiment, lead quality, and action points to optimize dashboard performance'; 