-- Migration: Create Node-Based Architecture Tables
-- Description: Creates the foundational tables for the unified node-based architecture
-- Date: 2024-01-XX

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Function Model Nodes Table
CREATE TABLE function_model_nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES function_models(model_id) ON DELETE CASCADE,
  
  -- Base node properties
  node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('stageNode', 'actionTableNode', 'ioNode', 'functionModelContainer')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  
  -- Process-specific properties
  execution_type VARCHAR(20) DEFAULT 'sequential' CHECK (execution_type IN ('sequential', 'parallel', 'conditional')),
  dependencies TEXT[] DEFAULT '{}',
  timeout INTEGER,
  retry_policy JSONB,
  
  -- Business logic properties
  raci_matrix JSONB,
  sla JSONB,
  kpis JSONB,
  
  -- Node data (feature-specific)
  stage_data JSONB,
  action_data JSONB,
  io_data JSONB,
  container_data JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Node Metadata Table
CREATE TABLE node_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('function-model', 'knowledge-base', 'spindle')),
  entity_id UUID NOT NULL,
  node_id VARCHAR(255),
  node_type VARCHAR(50) NOT NULL,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  vector_embedding VECTOR(1536),
  search_keywords TEXT[] DEFAULT '{}',
  ai_agent_config JSONB,
  visual_properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Node Links Table
CREATE TABLE node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feature VARCHAR(50) NOT NULL CHECK (source_feature IN ('function-model', 'knowledge-base', 'spindle')),
  source_entity_id UUID NOT NULL,
  source_node_id VARCHAR(255),
  target_feature VARCHAR(50) NOT NULL CHECK (target_feature IN ('function-model', 'knowledge-base', 'spindle')),
  target_entity_id UUID NOT NULL,
  target_node_id VARCHAR(255),
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('documents', 'implements', 'references', 'supports', 'nested', 'triggers', 'consumes', 'produces')),
  link_strength DECIMAL(3,2) DEFAULT 1.0 CHECK (link_strength >= 0 AND link_strength <= 1),
  link_context JSONB NOT NULL DEFAULT '{}',
  visual_properties JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update Cross-Feature Links Table with node-specific context
ALTER TABLE cross_feature_links 
ADD COLUMN IF NOT EXISTS node_context JSONB DEFAULT '{}';

-- Add index for node-level queries
CREATE INDEX IF NOT EXISTS idx_cross_feature_links_node_context 
ON cross_feature_links USING GIN (node_context);

-- Add constraint for node links
ALTER TABLE cross_feature_links 
ADD CONSTRAINT IF NOT EXISTS node_link_context_check 
CHECK (
  (node_context->>'nodeId' IS NOT NULL) OR 
  (node_context = '{}'::jsonb)
);

-- Create performance indexes
CREATE INDEX idx_function_model_nodes_model_id ON function_model_nodes(model_id);
CREATE INDEX idx_function_model_nodes_node_type ON function_model_nodes(node_type);
CREATE INDEX idx_function_model_nodes_created_at ON function_model_nodes(created_at);
CREATE INDEX idx_function_model_nodes_updated_at ON function_model_nodes(updated_at);

CREATE INDEX idx_node_metadata_feature_type ON node_metadata(feature_type);
CREATE INDEX idx_node_metadata_entity_id ON node_metadata(entity_id);
CREATE INDEX idx_node_metadata_node_type ON node_metadata(node_type);
CREATE INDEX idx_node_metadata_created_at ON node_metadata(created_at);

CREATE INDEX idx_node_links_source_feature ON node_links(source_feature);
CREATE INDEX idx_node_links_source_entity_id ON node_links(source_entity_id);
CREATE INDEX idx_node_links_target_feature ON node_links(target_feature);
CREATE INDEX idx_node_links_target_entity_id ON node_links(target_entity_id);
CREATE INDEX idx_node_links_link_type ON node_links(link_type);
CREATE INDEX idx_node_links_created_at ON node_links(created_at);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_function_model_nodes_updated_at BEFORE UPDATE ON function_model_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_metadata_updated_at BEFORE UPDATE ON node_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_links_updated_at BEFORE UPDATE ON node_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE function_model_nodes IS 'Individual nodes within function models with process-specific properties';
COMMENT ON TABLE node_metadata IS 'Unified metadata for all node types across features';
COMMENT ON TABLE node_links IS 'Cross-feature relationships between individual nodes';

COMMENT ON COLUMN function_model_nodes.node_type IS 'Specific node type: stageNode, actionTableNode, ioNode, functionModelContainer';
COMMENT ON COLUMN function_model_nodes.execution_type IS 'Process execution type: sequential, parallel, conditional';
COMMENT ON COLUMN function_model_nodes.dependencies IS 'Array of node IDs that this node depends on';
COMMENT ON COLUMN function_model_nodes.retry_policy IS 'JSON configuration for retry behavior';
COMMENT ON COLUMN function_model_nodes.raci_matrix IS 'RACI matrix for business process roles';
COMMENT ON COLUMN function_model_nodes.sla IS 'Service Level Agreement configuration';
COMMENT ON COLUMN function_model_nodes.kpis IS 'Key Performance Indicators for this node';

COMMENT ON COLUMN node_metadata.feature_type IS 'Feature type: function-model, knowledge-base, spindle';
COMMENT ON COLUMN node_metadata.entity_id IS 'ID of the parent entity (function model, knowledge base, etc.)';
COMMENT ON COLUMN node_metadata.node_id IS 'ID of the specific node within the entity';
COMMENT ON COLUMN node_metadata.vector_embedding IS 'AI vector embedding for semantic search';
COMMENT ON COLUMN node_metadata.ai_agent_config IS 'AI agent configuration for this node';

COMMENT ON COLUMN node_links.source_feature IS 'Source feature type';
COMMENT ON COLUMN node_links.source_entity_id IS 'Source entity ID';
COMMENT ON COLUMN node_links.source_node_id IS 'Source node ID (optional)';
COMMENT ON COLUMN node_links.target_feature IS 'Target feature type';
COMMENT ON COLUMN node_links.target_entity_id IS 'Target entity ID';
COMMENT ON COLUMN node_links.target_node_id IS 'Target node ID (optional)';
COMMENT ON COLUMN node_links.link_type IS 'Type of relationship between nodes';
COMMENT ON COLUMN node_links.link_strength IS 'Strength of the relationship (0-1)';
COMMENT ON COLUMN node_links.link_context IS 'Additional context for the relationship'; 