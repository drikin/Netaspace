# Release Notes

## Version 2.4.0 - 2025-06-07

### 🔧 Major Features

**Persistent Storage System**
- Implemented persistent SQLite storage to prevent data loss during Replit redeployments
- Database automatically uses `/tmp/persistent/` directory for production data
- All existing topic data (87+ topics) preserved across deployments
- Fallback system ensures application works even if persistent storage is unavailable

**Automatic Backup System**
- Daily automatic backups created before any database changes
- Manual backup download functionality in admin panel
- Backup verification and restoration capabilities
- Comprehensive backup management with cleanup of old files

### 🛠️ Technical Improvements

**Database Management**
- Enhanced SQLite schema with proper fingerprint field support
- Improved topic creation validation and error handling
- Fixed schema mismatches between client and server validation
- Optimized database initialization and migration processes

**Deployment Infrastructure**
- Created deployment scripts for persistent storage setup
- Enhanced production environment detection and configuration
- Automated database copying and verification during deployments
- Comprehensive deployment verification and testing tools

### 🐛 Bug Fixes

- Fixed topic submission failures after deployment by properly handling fingerprint generation
- Resolved schema validation errors preventing new topic creation
- Corrected crypto module import issues in topic creation endpoints
- Fixed database path resolution in production environments

### 📁 New Files and Scripts

- `scripts/persistent-storage.js` - Persistent storage setup and verification
- `scripts/test-persistent-storage.js` - Database integrity testing
- `scripts/deploy-production.js` - Enhanced production deployment
- `DEPLOYMENT.md` - Updated with persistent storage documentation

### 🔄 Migration Notes

For existing deployments:
1. Run `node scripts/persistent-storage.js` to setup persistent storage
2. Verify data integrity with the test script
3. All existing data will be automatically migrated to persistent storage
4. No manual intervention required for normal operations

### 💾 Data Persistence

- **Before**: Data lost on every Replit redeploy
- **After**: Complete data preservation across all deployments
- **Backup Strategy**: Automatic daily backups + manual export options
- **Recovery**: Instant restoration from persistent storage or backups

---

## Version 2.3.0 - 2025-06-06

### Features
- Enhanced admin panel with comprehensive topic management
- Database export functionality (JSON, CSV, SQLite formats)
- Advanced filtering and sorting for topic administration
- Bulk operations for topic status management

### Improvements
- Improved topic display and organization
- Enhanced error handling and user feedback
- Better responsive design for mobile devices

---

## Version 2.2.0 - 2025-06-05

### Features
- Chrome extension integration for easy topic submission
- Advanced topic filtering and search functionality
- Comment system for community engagement

### Improvements
- Performance optimizations for large topic lists
- Enhanced security with fingerprint-based user tracking
- Improved database query efficiency

---

## Version 2.1.0 - 2025-06-04

### Features
- Weekly topic management system
- Star rating system for community feedback
- Administrative controls for topic approval

### Improvements
- Enhanced UI/UX with modern design
- Better error handling and validation
- Improved database structure and relationships