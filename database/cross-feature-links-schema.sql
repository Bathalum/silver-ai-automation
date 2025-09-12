-- Cross-Feature Links Table Schema
-- 
-- This table stores relationships between different feature entities
-- in the Silver AI Automation system.
--
-- Features: FUNCTION_MODEL, KNOWLEDGE_BASE, SPINDLE, EVENT_STORM
-- Link Types: REFERENCES, SUPPORTS, DOCUMENTS, IMPLEMENTS, TRIGGERS, CONSUMES, PRODUCES, NESTED

-- Create cross_feature_links table
CREATE TABLE IF NOT EXISTS cross_feature_links (
  -- Primary key and unique identifier
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source entity information
  source_feature TEXT NOT NULL CHECK (source_feature IN ('FUNCTION_MODEL', 'KNOWLEDGE_BASE', 'SPINDLE', 'EVENT_STORM')),
  source_id TEXT NOT NULL,
  
  -- Target entity information
  target_feature TEXT NOT NULL CHECK (target_feature IN ('FUNCTION_MODEL', 'KNOWLEDGE_BASE', 'SPINDLE', 'EVENT_STORM')),
  target_id TEXT NOT NULL,
  
  -- Link properties
  link_type TEXT NOT NULL CHECK (link_type IN ('REFERENCES', 'SUPPORTS', 'DOCUMENTS', 'IMPLEMENTS', 'TRIGGERS', 'CONSUMES', 'PRODUCES', 'NESTED')),
  link_strength DECIMAL(3,2) NOT NULL CHECK (link_strength >= 0.0 AND link_strength <= 1.0),
  
  -- Optional node context (JSONB for flexible structure)
  node_context JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT no_self_linking CHECK (NOT (source_feature = target_feature AND source_id = target_id)),
  CONSTRAINT unique_cross_feature_link UNIQUE (source_feature, source_id, target_feature, target_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_source ON cross_feature_links (source_feature, source_id);
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_target ON cross_feature_links (target_feature, target_id);
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_link_type ON cross_feature_links (link_type);
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_strength ON cross_feature_links (link_strength);
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_created_at ON cross_feature_links (created_at);

-- Create index for finding links by feature type (source OR target)
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_by_feature 
ON cross_feature_links USING GIN (
  (ARRAY[source_feature, target_feature])
);

-- Create index for node context queries
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_node_context 
ON cross_feature_links USING GIN (node_context);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cross_feature_link_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cross_feature_link_updated_at
  BEFORE UPDATE ON cross_feature_links
  FOR EACH ROW
  EXECUTE FUNCTION update_cross_feature_link_updated_at();

-- Add Row Level Security (RLS) for multi-tenant support
ALTER TABLE cross_feature_links ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (adjust based on your authentication system)
-- CREATE POLICY cross_feature_links_tenant_isolation ON cross_feature_links
--   FOR ALL
--   USING (
--     -- Allow access based on auth context or tenant information
--     -- This is a placeholder - implement based on your auth system
--     true
--   );

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON cross_feature_links TO authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Sample data for testing (commented out for production)
/*
INSERT INTO cross_feature_links (
  link_id,
  source_feature,
  source_id,
  target_feature,
  target_id,
  link_type,
  link_strength,
  node_context
) VALUES 
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'FUNCTION_MODEL',
  'ml-workflow-001',
  'KNOWLEDGE_BASE',
  'training-data-kb',
  'REFERENCES',
  0.75,
  '{"nodeId": "workflow-step-001", "nodeType": "ProcessingStep", "metadata": {"priority": "high"}}'
),
(
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  'KNOWLEDGE_BASE',
  'training-data-kb',
  'SPINDLE',
  'data-pipeline',
  'SUPPORTS',
  0.60,
  '{"nodeId": "data-flow-001", "nodeType": "DataFlow"}'
);
*/