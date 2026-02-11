# Reducing Introspection Queries in Supabase

## Problem Analysis

Based on the Supabase query report, you have significant performance issues with introspection queries:

- **pg_proc queries**: 382 calls at 107.71ms average
- **pg_available_extensions queries**: 512 calls at 59.92ms average  
- **Table/column schema queries**: 180 calls at 68.54ms average
- **Total impact**: 20% + 15% + ... of database time

These are classic "dashboard/schema browser/API introspection" queries that are called hundreds of times with mean times of 60-110ms each.

## Root Causes

1. **Dashboard Auto-refresh**: Schema browser refreshing too frequently
2. **Eager Loading**: Loading all schema information on page load
3. **PostgREST Schema Cache Reloads**: Frequent DDL operations triggering cache invalidation
4. **Missing Application-level Caching**: No caching of schema metadata

## Solutions

### 1. Dashboard/Schema Browser Optimization

#### Reduce Auto-refresh Frequency
```javascript
// Before: Refresh every 5 seconds
const refreshInterval = setInterval(fetchSchema, 5000);

// After: Refresh every 5 minutes (or on demand)
const refreshInterval = setInterval(fetchSchema, 300000); // 5 minutes
```

#### Implement Caching Layer
```javascript
// Cache schema data for 10 minutes
const SCHEMA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

class SchemaCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < SCHEMA_CACHE_TTL) {
      return this.cache.get(key);
    }
    return null;
  }

  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }
}
```

#### Lazy Loading Implementation
```javascript
// Instead of loading everything on page load
function loadDashboard() {
  // Load only essential data first
  loadEssentialData().then(() => {
    // Lazy load schema info only when needed
    document.getElementById('schema-tab').addEventListener('click', () => {
      if (!schemaLoaded) {
        loadSchemaData();
        schemaLoaded = true;
      }
    });
  });
}
```

### 2. PostgREST Schema Cache Optimization

#### Avoid Peak Hour Migrations
```bash
# Schedule migrations during low-traffic hours
# Example: Run at 2 AM instead of during business hours
0 2 * * * /path/to/migration/script.sh
```

#### Minimize DDL Operations
```sql
-- Instead of multiple ALTER TABLE statements
-- Batch them together or avoid during peak hours

-- Good: Single migration during maintenance window
BEGIN;
ALTER TABLE businesses ADD COLUMN new_feature BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN feature_config JSONB;
COMMIT;

-- Avoid: Multiple small changes throughout the day
```

#### Monitor Schema Cache Stability
```sql
-- Monitor schema cache reloads
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements 
WHERE query ILIKE '%pg_proc%' OR query ILIKE '%information_schema%'
ORDER BY total_time DESC
LIMIT 10;
```

### 3. Application-level Schema Caching

#### Create a Schema Metadata Service
```typescript
// src/lib/schema-cache.ts
class SchemaMetadataService {
  private cache: Map<string, any> = new Map();
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  async getTableSchema(tableName: string) {
    const cacheKey = `table:${tableName}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - this.lastUpdate < this.CACHE_DURATION) {
      return cached;
    }

    const schema = await this.fetchTableSchema(tableName);
    this.cache.set(cacheKey, schema);
    this.lastUpdate = Date.now();
    return schema;
  }

  private async fetchTableSchema(tableName: string) {
    // Fetch from database or API
    const response = await fetch(`/api/schema/${tableName}`);
    return response.json();
  }
}
```

#### Implement Selective Schema Loading
```typescript
// Only load schema for tables that are actually being used
const usedTables = new Set(['businesses', 'reviews', 'profiles']);

// Load schema for only these tables
const schemas = await Promise.all(
  Array.from(usedTables).map(table => 
    schemaService.getTableSchema(table)
  )
);
```

## Monitoring and Alerting

### Set Up Query Monitoring
```sql
-- Create a monitoring view for introspection queries
CREATE VIEW introspection_query_stats AS
SELECT 
  query,
  calls,
  mean_time,
  total_time,
  calls * mean_time as estimated_cost
FROM pg_stat_statements 
WHERE 
  query ILIKE '%pg_proc%' OR 
  query ILIKE '%pg_available_extensions%' OR
  query ILIKE '%information_schema%' OR
  query ILIKE '%pg_namespace%'
ORDER BY total_time DESC;
```

### Alert on High Frequency
```sql
-- Alert when introspection queries exceed threshold
SELECT 
  query,
  calls,
  mean_time
FROM pg_stat_statements 
WHERE 
  (query ILIKE '%pg_proc%' AND calls > 100) OR
  (query ILIKE '%pg_available_extensions%' AND calls > 200)
  AND last_execution > NOW() - INTERVAL '1 hour';
```

## Expected Improvements

### Performance Gains
- **Introspection queries**: 80-90% reduction in frequency
- **Dashboard responsiveness**: 2-5x faster initial load
- **Database load**: 15-25% reduction in overall query time
- **User experience**: Much faster schema browsing and API documentation

### Resource Savings
- **CPU usage**: Reduced by avoiding repeated system catalog queries
- **Memory**: Less schema metadata loaded unnecessarily
- **Network**: Fewer round trips to database for schema information

## Implementation Priority

1. **Immediate (High Impact)**:
   - Increase dashboard refresh intervals
   - Implement basic caching for schema data

2. **Short-term (Medium Impact)**:
   - Add lazy loading for schema components
   - Monitor and alert on high-frequency queries

3. **Long-term (Sustainable)**:
   - Implement comprehensive schema caching service
   - Optimize migration scheduling
   - Add detailed monitoring and analytics

## Next Steps

1. **Apply the timezone optimization** first (already created)
2. **Implement dashboard caching** using the patterns above
3. **Monitor query performance** after changes
4. **Iterate based on real-world usage patterns**

The combination of timezone optimization and introspection query reduction should provide significant performance improvements across your entire application.