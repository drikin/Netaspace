# Persistent Storage Implementation Guide

## Overview

This guide documents the persistent storage system implemented to prevent data loss during Replit redeployments. The solution ensures that all podcast topic data, comments, stars, and user information survive across deployments.

## Problem Solved

**Before**: Replit redeployments would reset the project directory, causing complete data loss of all topics, comments, and user interactions.

**After**: Data persists across all redeployments using a robust persistent storage system with automatic backups.

## Implementation Details

### Storage Locations (Priority Order)

1. **Primary**: `/tmp/persistent/production.sqlite` - Most reliable persistent directory
2. **Fallback**: `./data/production.sqlite` - Secondary option if persistent directory unavailable
3. **Development**: `./database/dev.sqlite` - Development environment only

### Automatic Features

- **Smart Detection**: Application automatically detects and uses persistent database if available
- **Seamless Migration**: Development data automatically copied to persistent storage on first deployment
- **Backup Creation**: Daily backups created before any major operations
- **Data Verification**: Automatic integrity checks ensure data consistency

## Usage Instructions

### Initial Setup

```bash
# Setup persistent storage (one-time)
node scripts/persistent-storage.js
```

### Deployment Process

1. Run persistent storage setup script
2. Deploy using Replit's Deploy button
3. Data automatically preserved across deployments
4. No manual intervention required

### Verification

```bash
# Test persistent storage integrity
node scripts/test-persistent-storage.js

# Check current database status
sqlite3 /tmp/persistent/production.sqlite ".tables"
```

## File Structure

```
├── /tmp/persistent/              # Persistent storage directory
│   ├── production.sqlite        # Main production database
│   └── backups/                 # Automatic backups
│       └── production-YYYY-MM-DD.sqlite
├── scripts/
│   ├── persistent-storage.js    # Setup and verification
│   ├── test-persistent-storage.js # Integrity testing
│   └── deploy-production.js     # Enhanced deployment
└── server/storage.ts            # Smart database path detection
```

## Technical Implementation

### Database Path Resolution

```typescript
function getDatabasePath() {
  // Priority 1: Use persistent database if exists
  if (fs.existsSync('/tmp/persistent/production.sqlite')) {
    return '/tmp/persistent/production.sqlite';
  }
  
  // Priority 2: Production environment setup
  if (process.env.REPLIT_DEPLOYMENT) {
    // Create persistent directory and migrate data
    return setupPersistentStorage();
  }
  
  // Priority 3: Development environment
  return './database/dev.sqlite';
}
```

### Backup Strategy

- **Frequency**: Daily automatic backups before deployments
- **Location**: `/tmp/persistent/backups/`
- **Retention**: Automatic cleanup of old backups
- **Manual**: Admin panel download functionality

## Benefits

1. **Zero Data Loss**: Complete protection against redeploy data loss
2. **Automatic Operation**: No manual intervention required
3. **Backup Protection**: Multiple layers of data protection
4. **Seamless Experience**: Users see no difference in functionality
5. **Admin Control**: Full backup management through admin interface

## Monitoring

### Health Checks

```bash
# Check database exists and size
ls -la /tmp/persistent/production.sqlite

# Verify data count
sqlite3 /tmp/persistent/production.sqlite "SELECT COUNT(*) FROM topics;"

# Check backup status
ls -la /tmp/persistent/backups/
```

### Troubleshooting

If persistent storage is not working:

1. Check if `/tmp/persistent/` directory exists and is writable
2. Verify production environment variables are set
3. Run the test script to identify specific issues
4. Use fallback storage option in `./data/` directory

## Migration from Previous Versions

Existing deployments are automatically migrated:

1. Development database copied to persistent storage
2. All existing topics, comments, and stars preserved
3. New topic submissions work immediately
4. No data structure changes required

## Security Considerations

- Persistent directory has appropriate file permissions
- Database files protected from unauthorized access
- Backup files include same security measures as production database
- Fingerprint-based user tracking maintains privacy

## Performance Impact

- Minimal performance impact from persistent storage
- Database operations maintain same speed
- Backup creation runs asynchronously
- No impact on user experience

## Future Enhancements

- Automatic database optimization and cleanup
- Enhanced backup rotation policies
- Real-time database replication options
- Advanced monitoring and alerting

## Support

For issues related to persistent storage:

1. Run diagnostic scripts first
2. Check logs for storage-related errors
3. Verify environment configuration
4. Contact system administrator if problems persist