-- Migration Scripts for Data Migration
-- Description: Scripts to migrate existing data to the unified node system
-- Date: 2024-01-XX

-- Function to migrate function model data to unified nodes
CREATE OR REPLACE FUNCTION migrate_function_model_nodes()
RETURNS void AS $$
DECLARE
    func_model RECORD;
    new_node_id UUID;
BEGIN
    -- Check if function_models table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'function_models') THEN
        RAISE NOTICE 'function_models table does not exist, skipping migration';
        RETURN;
    END IF;
    
    -- Migrate function model containers
    FOR func_model IN SELECT * FROM function_models LOOP
        INSERT INTO nodes (
            type,
            node_type,
            name,
            description,
            position_x,
            position_y,
            metadata
        ) VALUES (
            'function-model',
            'functionModelContainerNode',
            COALESCE(func_model.name, 'Unnamed Function Model'),
            COALESCE(func_model.description, ''),
            0,
            0,
            jsonb_build_object(
                'feature', 'function-model',
                'version', '1.0',
                'tags', ARRAY['function-model', 'container'],
                'functionModel', jsonb_build_object(
                    'container', jsonb_build_object(
                        'id', func_model.id,
                        'name', func_model.name,
                        'description', func_model.description,
                        'type', 'function-model'
                    )
                )
            )
        ) RETURNING node_id INTO new_node_id;
        
        RAISE NOTICE 'Migrated function model % to node %', func_model.id, new_node_id;
    END LOOP;
    
    RAISE NOTICE 'Function model migration completed';
END;
$$ LANGUAGE plpgsql;

-- Function to migrate event storm data to unified nodes
CREATE OR REPLACE FUNCTION migrate_event_storm_nodes()
RETURNS void AS $$
DECLARE
    event_storm RECORD;
    new_node_id UUID;
BEGIN
    -- Check if event_storms table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_storms') THEN
        RAISE NOTICE 'event_storms table does not exist, skipping migration';
        RETURN;
    END IF;
    
    -- Migrate event storm containers
    FOR event_storm IN SELECT * FROM event_storms LOOP
        INSERT INTO nodes (
            type,
            node_type,
            name,
            description,
            position_x,
            position_y,
            metadata
        ) VALUES (
            'event-storm',
            'eventStormContainerNode',
            COALESCE(event_storm.name, 'Unnamed Event Storm'),
            COALESCE(event_storm.description, ''),
            0,
            0,
            jsonb_build_object(
                'feature', 'event-storm',
                'version', '1.0',
                'tags', ARRAY['event-storm', 'container'],
                'eventStorm', jsonb_build_object(
                    'container', jsonb_build_object(
                        'id', event_storm.id,
                        'name', event_storm.name,
                        'description', event_storm.description,
                        'type', 'event-storm'
                    )
                )
            )
        ) RETURNING node_id INTO new_node_id;
        
        RAISE NOTICE 'Migrated event storm % to node %', event_storm.id, new_node_id;
    END LOOP;
    
    RAISE NOTICE 'Event storm migration completed';
END;
$$ LANGUAGE plpgsql;

-- Function to migrate knowledge base data to unified nodes
CREATE OR REPLACE FUNCTION migrate_knowledge_base_nodes()
RETURNS void AS $$
DECLARE
    sop_record RECORD;
    new_node_id UUID;
BEGIN
    -- Check if sops table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sops') THEN
        RAISE NOTICE 'sops table does not exist, skipping migration';
        RETURN;
    END IF;
    
    -- Migrate SOPs to knowledge base nodes
    FOR sop_record IN SELECT * FROM sops LOOP
        INSERT INTO nodes (
            type,
            node_type,
            name,
            description,
            position_x,
            position_y,
            metadata
        ) VALUES (
            'knowledge-base',
            'sop',
            COALESCE(sop_record.title, 'Unnamed SOP'),
            COALESCE(sop_record.summary, ''),
            0,
            0,
            jsonb_build_object(
                'feature', 'knowledge-base',
                'version', COALESCE(sop_record.version, '1.0'),
                'tags', COALESCE(sop_record.tags, ARRAY['sop']),
                'knowledgeBase', jsonb_build_object(
                    'sop', jsonb_build_object(
                        'id', sop_record.id,
                        'title', sop_record.title,
                        'summary', sop_record.summary,
                        'content', sop_record.content,
                        'category', COALESCE(sop_record.category, 'general'),
                        'status', COALESCE(sop_record.status, 'draft'),
                        'version', COALESCE(sop_record.version, '1.0'),
                        'tags', COALESCE(sop_record.tags, ARRAY['sop'])
                    ),
                    'content', sop_record.content,
                    'category', COALESCE(sop_record.category, 'general'),
                    'status', COALESCE(sop_record.status, 'draft')
                )
            )
        ) RETURNING node_id INTO new_node_id;
        
        RAISE NOTICE 'Migrated SOP % to node %', sop_record.id, new_node_id;
    END LOOP;
    
    RAISE NOTICE 'Knowledge base migration completed';
END;
$$ LANGUAGE plpgsql;

-- Function to migrate spindle data to unified nodes
CREATE OR REPLACE FUNCTION migrate_spindle_nodes()
RETURNS void AS $$
DECLARE
    spindle_record RECORD;
    new_node_id UUID;
BEGIN
    -- Check if spindle_nodes table exists (or similar)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spindle_nodes') THEN
        RAISE NOTICE 'spindle_nodes table does not exist, skipping migration';
        RETURN;
    END IF;
    
    -- Migrate spindle nodes
    FOR spindle_record IN SELECT * FROM spindle_nodes LOOP
        INSERT INTO nodes (
            type,
            node_type,
            name,
            description,
            position_x,
            position_y,
            metadata
        ) VALUES (
            'spindle',
            COALESCE(spindle_record.node_type, 'custom'),
            COALESCE(spindle_record.label, 'Unnamed Spindle Node'),
            COALESCE(spindle_record.description, ''),
            COALESCE(spindle_record.position_x, 0),
            COALESCE(spindle_record.position_y, 0),
            jsonb_build_object(
                'feature', 'spindle',
                'version', '1.0',
                'tags', ARRAY['spindle', COALESCE(spindle_record.node_type, 'custom')],
                'spindle', jsonb_build_object(
                    'label', spindle_record.label,
                    'description', spindle_record.description
                )
            )
        ) RETURNING node_id INTO new_node_id;
        
        RAISE NOTICE 'Migrated spindle node % to node %', spindle_record.id, new_node_id;
    END LOOP;
    
    RAISE NOTICE 'Spindle migration completed';
END;
$$ LANGUAGE plpgsql;

-- Function to create relationships between migrated nodes
CREATE OR REPLACE FUNCTION create_migrated_relationships()
RETURNS void AS $$
DECLARE
    source_node RECORD;
    target_node RECORD;
    relationship_count INTEGER := 0;
BEGIN
    -- Create relationships between function model nodes and knowledge base nodes
    -- This is an example - adjust based on your actual relationship logic
    
    FOR source_node IN 
        SELECT node_id, name FROM nodes 
        WHERE type = 'function-model' AND node_type = 'functionModelContainerNode'
    LOOP
        -- Find related knowledge base nodes (example: by name similarity)
        FOR target_node IN 
            SELECT node_id, name FROM nodes 
            WHERE type = 'knowledge-base' 
            AND (name ILIKE '%' || source_node.name || '%' OR name ILIKE '%' || source_node.name || '%')
        LOOP
            INSERT INTO node_relationships (
                source_node_id,
                target_node_id,
                relationship_type,
                metadata
            ) VALUES (
                source_node.node_id,
                target_node.node_id,
                'reference',
                jsonb_build_object(
                    'strength', 0.8,
                    'bidirectional', true,
                    'migration_source', 'auto-generated'
                )
            );
            
            relationship_count := relationship_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Created % relationships between migrated nodes', relationship_count;
END;
$$ LANGUAGE plpgsql;

-- Function to run all migrations
CREATE OR REPLACE FUNCTION run_all_migrations()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Starting unified node migration...';
    
    -- Run individual migrations
    PERFORM migrate_function_model_nodes();
    PERFORM migrate_event_storm_nodes();
    PERFORM migrate_knowledge_base_nodes();
    PERFORM migrate_spindle_nodes();
    
    -- Create relationships
    PERFORM create_migrated_relationships();
    
    RAISE NOTICE 'All migrations completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to rollback migrations (if needed)
CREATE OR REPLACE FUNCTION rollback_migrations()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Rolling back unified node migrations...';
    
    -- Delete all relationships
    DELETE FROM node_relationships;
    
    -- Delete all AI agents
    DELETE FROM ai_agents;
    
    -- Delete all nodes
    DELETE FROM nodes;
    
    RAISE NOTICE 'Rollback completed';
END;
$$ LANGUAGE plpgsql;

-- Function to check migration status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
    table_name TEXT,
    record_count BIGINT,
    migrated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'nodes'::TEXT as table_name,
        COUNT(*) as record_count,
        COUNT(*) > 0 as migrated
    FROM nodes
    UNION ALL
    SELECT 
        'node_relationships'::TEXT as table_name,
        COUNT(*) as record_count,
        COUNT(*) > 0 as migrated
    FROM node_relationships
    UNION ALL
    SELECT 
        'ai_agents'::TEXT as table_name,
        COUNT(*) as record_count,
        COUNT(*) > 0 as migrated
    FROM ai_agents;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION migrate_function_model_nodes() IS 'Migrates function model data to unified nodes';
COMMENT ON FUNCTION migrate_event_storm_nodes() IS 'Migrates event storm data to unified nodes';
COMMENT ON FUNCTION migrate_knowledge_base_nodes() IS 'Migrates knowledge base data to unified nodes';
COMMENT ON FUNCTION migrate_spindle_nodes() IS 'Migrates spindle data to unified nodes';
COMMENT ON FUNCTION create_migrated_relationships() IS 'Creates relationships between migrated nodes';
COMMENT ON FUNCTION run_all_migrations() IS 'Runs all migration functions';
COMMENT ON FUNCTION rollback_migrations() IS 'Rolls back all migrations';
COMMENT ON FUNCTION check_migration_status() IS 'Checks the status of migrations'; 