-- Description: Creates the foundational tables for the node-based architecture
-- This migration establishes the core database schema for the node-based system
-- supporting function models, event storms, spindles, and knowledge base features

-- Create the nodes table for all node types
CREATE TABLE IF NOT EXISTS nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('function-model', 'event-storm', 'spindle', 'knowledge-base')),
  entity_id UUID NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_feature_type ON nodes(feature_type);
CREATE INDEX IF NOT EXISTS idx_nodes_entity_id ON nodes(entity_id);
CREATE INDEX IF NOT EXISTS idx_nodes_node_type ON nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_created_at ON nodes(created_at);

-- Create the node_links table for relationships
CREATE TABLE IF NOT EXISTS node_links (
  link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_feature VARCHAR(50) NOT NULL,
  source_entity_id UUID NOT NULL,
  source_node_id UUID,
  target_feature VARCHAR(50) NOT NULL,
  target_entity_id UUID NOT NULL,
  target_node_id UUID,
  link_type VARCHAR(50) NOT NULL DEFAULT 'dependency',
  link_strength DECIMAL(3,2) DEFAULT 1.0,
  link_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for node_links
CREATE INDEX IF NOT EXISTS idx_node_links_source ON node_links(source_feature, source_entity_id, source_node_id);
CREATE INDEX IF NOT EXISTS idx_node_links_target ON node_links(target_feature, target_entity_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_node_links_type ON node_links(link_type);

-- Create the node_metadata table for additional metadata
CREATE TABLE IF NOT EXISTS node_metadata (
  metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  metadata_key VARCHAR(100) NOT NULL,
  metadata_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(node_id, metadata_key)
);

-- Create indexes for node_metadata
CREATE INDEX IF NOT EXISTS idx_node_metadata_node_id ON node_metadata(node_id);
CREATE INDEX IF NOT EXISTS idx_node_metadata_key ON node_metadata(metadata_key);

-- Create the node_executions table for tracking node executions
CREATE TABLE IF NOT EXISTS node_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  execution_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for node_executions
CREATE INDEX IF NOT EXISTS idx_node_executions_node_id ON node_executions(node_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_status ON node_executions(status);
CREATE INDEX IF NOT EXISTS idx_node_executions_started_at ON node_executions(started_at);

-- Create the node_ai_agents table for AI agent configurations
CREATE TABLE IF NOT EXISTS node_ai_agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  agent_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for node_ai_agents
CREATE INDEX IF NOT EXISTS idx_node_ai_agents_node_id ON node_ai_agents(node_id);
CREATE INDEX IF NOT EXISTS idx_node_ai_agents_type ON node_ai_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_node_ai_agents_active ON node_ai_agents(is_active);

-- Add comments to tables
COMMENT ON TABLE nodes IS 'Core table for all node types across features';
COMMENT ON TABLE node_links IS 'Relationships between nodes across different features';
COMMENT ON TABLE node_metadata IS 'Additional metadata for all node types across features';
COMMENT ON TABLE node_executions IS 'Execution history and results for nodes';
COMMENT ON TABLE node_ai_agents IS 'AI agent configurations for nodes'; 