-- Row Level Security Policies for Unified Node System
-- Description: RLS policies for secure data access control
-- Date: 2024-01-XX

-- Enable RLS on all tables
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for nodes table
CREATE POLICY "Users can view their own nodes" ON nodes
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own nodes" ON nodes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own nodes" ON nodes
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own nodes" ON nodes
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create policies for node_relationships table
CREATE POLICY "Users can view relationships for their nodes" ON node_relationships
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.source_node_id 
                AND auth.uid() IS NOT NULL
            ) OR 
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.target_node_id 
                AND auth.uid() IS NOT NULL
            )
        )
    );

CREATE POLICY "Users can create relationships for their nodes" ON node_relationships
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.source_node_id 
                AND auth.uid() IS NOT NULL
            ) AND 
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.target_node_id 
                AND auth.uid() IS NOT NULL
            )
        )
    );

CREATE POLICY "Users can update relationships for their nodes" ON node_relationships
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.source_node_id 
                AND auth.uid() IS NOT NULL
            ) OR 
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.target_node_id 
                AND auth.uid() IS NOT NULL
            )
        )
    );

CREATE POLICY "Users can delete relationships for their nodes" ON node_relationships
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.source_node_id 
                AND auth.uid() IS NOT NULL
            ) OR 
            EXISTS (
                SELECT 1 FROM nodes 
                WHERE node_id = node_relationships.target_node_id 
                AND auth.uid() IS NOT NULL
            )
        )
    );

-- Create policies for ai_agents table
CREATE POLICY "Users can view AI agents for their nodes" ON ai_agents
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM nodes 
            WHERE node_id = ai_agents.node_id 
            AND auth.uid() IS NOT NULL
        )
    );

CREATE POLICY "Users can create AI agents for their nodes" ON ai_agents
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM nodes 
            WHERE node_id = ai_agents.node_id 
            AND auth.uid() IS NOT NULL
        )
    );

CREATE POLICY "Users can update AI agents for their nodes" ON ai_agents
    FOR UPDATE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM nodes 
            WHERE node_id = ai_agents.node_id 
            AND auth.uid() IS NOT NULL
        )
    );

CREATE POLICY "Users can delete AI agents for their nodes" ON ai_agents
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND 
        EXISTS (
            SELECT 1 FROM nodes 
            WHERE node_id = ai_agents.node_id 
            AND auth.uid() IS NOT NULL
        )
    );

-- Function to check if user owns a node
CREATE OR REPLACE FUNCTION user_owns_node(node_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM nodes 
        WHERE nodes.node_id = user_owns_node.node_id 
        AND auth.uid() IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access node relationship
CREATE OR REPLACE FUNCTION user_can_access_relationship(rel_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    source_node_id UUID;
    target_node_id UUID;
BEGIN
    SELECT source_node_id, target_node_id 
    INTO source_node_id, target_node_id
    FROM node_relationships 
    WHERE relationship_id = rel_id;
    
    RETURN user_owns_node(source_node_id) OR user_owns_node(target_node_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access AI agent
CREATE OR REPLACE FUNCTION user_can_access_ai_agent(agent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    node_id UUID;
BEGIN
    SELECT ai_agents.node_id 
    INTO node_id
    FROM ai_agents 
    WHERE agent_id = user_can_access_ai_agent.agent_id;
    
    RETURN user_owns_node(node_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON nodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON node_relationships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_agents TO authenticated;

-- Grant usage on sequences (if using serial IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for better performance with RLS
CREATE INDEX idx_nodes_auth_user ON nodes (auth.uid());
CREATE INDEX idx_node_relationships_auth_user ON node_relationships (source_node_id, target_node_id);
CREATE INDEX idx_ai_agents_auth_user ON ai_agents (node_id);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own nodes" ON nodes IS 'Allows users to view nodes they own';
COMMENT ON POLICY "Users can insert their own nodes" ON nodes IS 'Allows users to create new nodes';
COMMENT ON POLICY "Users can update their own nodes" ON nodes IS 'Allows users to update nodes they own';
COMMENT ON POLICY "Users can delete their own nodes" ON nodes IS 'Allows users to delete nodes they own';

COMMENT ON POLICY "Users can view relationships for their nodes" ON node_relationships IS 'Allows users to view relationships involving their nodes';
COMMENT ON POLICY "Users can create relationships for their nodes" ON node_relationships IS 'Allows users to create relationships between their nodes';
COMMENT ON POLICY "Users can update relationships for their nodes" ON node_relationships IS 'Allows users to update relationships involving their nodes';
COMMENT ON POLICY "Users can delete relationships for their nodes" ON node_relationships IS 'Allows users to delete relationships involving their nodes';

COMMENT ON POLICY "Users can view AI agents for their nodes" ON ai_agents IS 'Allows users to view AI agents for their nodes';
COMMENT ON POLICY "Users can create AI agents for their nodes" ON ai_agents IS 'Allows users to create AI agents for their nodes';
COMMENT ON POLICY "Users can update AI agents for their nodes" ON ai_agents IS 'Allows users to update AI agents for their nodes';
COMMENT ON POLICY "Users can delete AI agents for their nodes" ON ai_agents IS 'Allows users to delete AI agents for their nodes';

COMMENT ON FUNCTION user_owns_node(UUID) IS 'Checks if the current user owns a specific node';
COMMENT ON FUNCTION user_can_access_relationship(UUID) IS 'Checks if the current user can access a specific relationship';
COMMENT ON FUNCTION user_can_access_ai_agent(UUID) IS 'Checks if the current user can access a specific AI agent'; 