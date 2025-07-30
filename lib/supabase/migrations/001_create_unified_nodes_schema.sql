-- Migration: Create Unified Nodes Schema
-- Description: Creates the foundational tables for the unified node-based architecture
-- Date: 2024-01-XX

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the unified nodes table
CREATE TABLE nodes (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('function-model', 'event-storm', 'spindle', 'knowledge-base')),
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  position_x DECIMAL(10,2) DEFAULT 0,
  position_y DECIMAL(10,2) DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the node relationships table
CREATE TABLE node_relationships (
  relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('parent-child', 'sibling', 'reference', 'dependency')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent self-referencing relationships
  CONSTRAINT no_self_reference CHECK (source_node_id != target_node_id)
);

-- Create the AI agents table
CREATE TABLE ai_agents (
  agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES nodes(node_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  instructions TEXT,
  tools JSONB NOT NULL DEFAULT '[]',
  capabilities JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one agent per node
  UNIQUE(node_id)
);

-- Create performance indexes
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_node_type ON nodes(node_type);
CREATE INDEX idx_nodes_metadata_feature ON nodes((metadata->>'feature'));
CREATE INDEX idx_nodes_created_at ON nodes(created_at);
CREATE INDEX idx_nodes_updated_at ON nodes(updated_at);

CREATE INDEX idx_node_relationships_source ON node_relationships(source_node_id);
CREATE INDEX idx_node_relationships_target ON node_relationships(target_node_id);
CREATE INDEX idx_node_relationships_type ON node_relationships(relationship_type);
CREATE INDEX idx_node_relationships_created_at ON node_relationships(created_at);

CREATE INDEX idx_ai_agents_node_id ON ai_agents(node_id);
CREATE INDEX idx_ai_agents_name ON ai_agents(name);
CREATE INDEX idx_ai_agents_created_at ON ai_agents(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE nodes IS 'Unified table for all node types across features';
COMMENT ON TABLE node_relationships IS 'Relationships between nodes across features';
COMMENT ON TABLE ai_agents IS 'AI agent configurations linked to nodes';

COMMENT ON COLUMN nodes.type IS 'Feature type: function-model, event-storm, spindle, knowledge-base';
COMMENT ON COLUMN nodes.node_type IS 'Specific node type within the feature';
COMMENT ON COLUMN nodes.metadata IS 'Flexible JSON storage for feature-specific data and AI metadata';
COMMENT ON COLUMN node_relationships.relationship_type IS 'Type of relationship between nodes';
COMMENT ON COLUMN ai_agents.tools IS 'Array of AI tools available to the agent';
COMMENT ON COLUMN ai_agents.capabilities IS 'Agent capabilities configuration'; 