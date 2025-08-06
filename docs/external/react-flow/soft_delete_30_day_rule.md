# 30-Day Soft Delete Rule Implementation

## Overview

This document describes the implementation of a 30-day soft delete rule that automatically permanently deletes records after they have been soft-deleted for 30 days. This provides a safety net for accidental deletions while ensuring database cleanup.

## How It Works

### 1. Soft Delete Process
- When a record is "deleted" in the UI, it's actually soft-deleted by setting `deleted_at` timestamp
- The record remains in the database but is filtered out of normal queries
- Users have 30 days to restore the record before permanent deletion

### 2. Permanent Deletion Process
- Records with `deleted_at` older than 30 days are automatically permanently deleted
- This includes cascading deletion of related records (nodes, links, metadata)
- The process is designed to maintain referential integrity

## Database Functions

### Core Functions

#### `permanently_delete_old_records()`
**Purpose**: Permanently deletes records that have been soft-deleted for more than 30 days.

**Usage**:
```sql
SELECT permanently_delete_old_records();
```

**What it does**:
- Deletes function models older than 30 days
- Cascades deletion to related records:
  - Function model nodes
  - Cross-feature links
  - Node links
  - Node metadata
  - Function model versions

#### `trigger_cleanup_old_records()`
**Purpose**: Manually triggers the cleanup and returns a report.

**Usage**:
```sql
SELECT trigger_cleanup_old_records();
```

**Returns**: A text report of what was deleted.

### Monitoring Functions

#### `preview_cleanup_old_records()`
**Purpose**: Shows what records will be deleted without actually deleting them.

**Usage**:
```sql
SELECT * FROM preview_cleanup_old_records();
```

**Returns**: Table showing records that would be deleted.

#### `get_cleanup_statistics()`
**Purpose**: Provides overall statistics about soft-deleted records.

**Usage**:
```sql
SELECT * FROM get_cleanup_statistics();
```

**Returns**: Statistics including total soft-deleted records and cleanup recommendations.

#### `get_detailed_cleanup_info()`
**Purpose**: Provides detailed information about soft-deleted records by table.

**Usage**:
```sql
SELECT * FROM get_detailed_cleanup_info();
```

**Returns**: Detailed breakdown by table with age information.

### Restoration Functions

#### `restore_soft_deleted_record(model_id, restored_by)`
**Purpose**: Restores a soft-deleted function model.

**Usage**:
```sql
SELECT restore_soft_deleted_record('uuid-here', 'user-uuid');
```

**Parameters**:
- `model_id`: UUID of the function model to restore
- `restored_by`: UUID of the user performing the restoration (optional)

## Database Views

### `soft_deleted_records_view`
Shows all soft-deleted records with their age and deletion status.

**Usage**:
```sql
SELECT * FROM soft_deleted_records_view;
```

**Columns**:
- `table_name`: Name of the table
- `record_id`: ID of the soft-deleted record
- `record_name`: Name of the record
- `deleted_at`: When it was soft-deleted
- `deleted_by`: Who deleted it
- `days_since_deleted`: How many days ago it was deleted
- `deletion_status`: Status (Recently deleted, Approaching deletion, Ready for permanent deletion)
- `days_until_permanent_deletion`: Days until permanent deletion

### `cleanup_recommendations_view`
Shows cleanup recommendations based on records older than 30 days.

**Usage**:
```sql
SELECT * FROM cleanup_recommendations_view;
```

**Columns**:
- `table_name`: Name of the table
- `records_to_delete`: Number of records ready for deletion
- `oldest_deleted_date`: Oldest soft-deleted record
- `newest_deleted_date`: Newest soft-deleted record
- `recommendation`: Whether cleanup is recommended
- `oldest_record_age_days`: Age of oldest record in days

## Manual Cleanup Process

### Step 1: Preview What Will Be Deleted
```sql
SELECT * FROM preview_cleanup_old_records();
```

### Step 2: Check Statistics
```sql
SELECT * FROM get_cleanup_statistics();
```

### Step 3: Run Cleanup
```sql
SELECT trigger_cleanup_old_records();
```

### Step 4: Verify Cleanup
```sql
SELECT * FROM get_cleanup_statistics();
```

## Application Integration

### Frontend Monitoring
You can create admin panels to monitor soft-deleted records:

```typescript
// Example: Get cleanup statistics
const getCleanupStats = async () => {
  const { data, error } = await supabase
    .rpc('get_cleanup_statistics');
  
  if (error) throw error;
  return data;
};

// Example: Preview cleanup
const previewCleanup = async () => {
  const { data, error } = await supabase
    .rpc('preview_cleanup_old_records');
  
  if (error) throw error;
  return data;
};

// Example: Run cleanup
const runCleanup = async () => {
  const { data, error } = await supabase
    .rpc('trigger_cleanup_old_records');
  
  if (error) throw error;
  return data;
};
```

### Scheduled Cleanup
Since pg_cron is not available, you can implement scheduled cleanup in your application:

```typescript
// Example: Daily cleanup job
const dailyCleanup = async () => {
  try {
    // Check if cleanup is needed
    const stats = await getCleanupStats();
    
    if (stats.cleanup_recommended) {
      // Run cleanup
      const result = await runCleanup();
      console.log('Cleanup completed:', result);
    } else {
      console.log('No cleanup needed');
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

// Schedule this to run daily
setInterval(dailyCleanup, 24 * 60 * 60 * 1000); // Daily
```

## Best Practices

### 1. Regular Monitoring
- Check `get_cleanup_statistics()` regularly
- Monitor `soft_deleted_records_view` for approaching deletions
- Set up alerts for records approaching the 30-day limit

### 2. User Communication
- Inform users about the 30-day restoration window
- Provide clear messaging about permanent deletion
- Offer restoration options in the UI

### 3. Backup Strategy
- Ensure regular backups before cleanup runs
- Consider archiving important data before permanent deletion
- Test restoration procedures regularly

### 4. Performance Considerations
- Indexes are created on `deleted_at` for efficient queries
- Cleanup functions are optimized for batch operations
- Consider running cleanup during low-traffic periods

## Error Handling

### Common Issues

1. **Permission Errors**
   - Ensure functions have proper `SECURITY DEFINER`
   - Check user permissions for function execution

2. **Cascade Deletion Issues**
   - Verify foreign key constraints
   - Check for circular references

3. **Performance Issues**
   - Monitor query performance on large datasets
   - Consider batching for very large deletions

### Troubleshooting

```sql
-- Check if cleanup functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%cleanup%';

-- Check soft-deleted records
SELECT COUNT(*) FROM function_models WHERE deleted_at IS NOT NULL;

-- Check records older than 30 days
SELECT COUNT(*) FROM function_models 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '30 days';
```

## Future Enhancements

### 1. Additional Tables
When new feature tables are added, update the cleanup functions:

```sql
-- Example: Add knowledge base cleanup
DELETE FROM knowledge_base_sops 
WHERE deleted_at IS NOT NULL 
AND deleted_at < NOW() - INTERVAL '30 days';
```

### 2. Configurable Retention Period
Consider making the 30-day period configurable:

```sql
-- Example: Configurable retention
CREATE TABLE cleanup_config (
  retention_days INTEGER DEFAULT 30,
  enabled BOOLEAN DEFAULT true
);
```

### 3. Audit Logging
Add comprehensive audit logging for cleanup operations:

```sql
-- Example: Audit log table
CREATE TABLE cleanup_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  records_deleted INTEGER,
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  executed_by UUID REFERENCES auth.users(id)
);
```

## Security Considerations

### 1. Function Security
- All functions use `SECURITY DEFINER` for proper permissions
- Functions are granted to `authenticated` users only
- No direct table access for cleanup operations

### 2. Data Protection
- Soft-deleted records are still protected by RLS policies
- Restoration requires proper authentication
- Audit trail maintained for all operations

### 3. Access Control
- Only authorized users can run cleanup operations
- Restoration requires appropriate permissions
- Monitoring views are restricted to authenticated users

## Conclusion

The 30-day soft delete rule provides a robust solution for data management that balances user safety with database performance. The implementation includes comprehensive monitoring, manual controls, and proper error handling to ensure reliable operation.

Regular monitoring and maintenance of this system will ensure optimal performance and user experience. 