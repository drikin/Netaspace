# Release Notes

## Version 2.6.2 (2025-06-13)

### 🌏 Character Encoding Support
- **SHIFT-JIS Compatibility**: Fixed character corruption issues on Japanese sites like ITMedia
- **Multi-Encoding Detection**: Automatic detection and conversion for SHIFT-JIS, EUC-JP, and ISO-2022-JP
- **Smart Charset Detection**: Reads encoding from HTTP headers and HTML meta tags
- **Robust Fallback**: Safe handling when encoding conversion fails

### 🔧 Technical Improvements
- **Modern API Usage**: Updated from deprecated buffer() to arrayBuffer() method
- **Performance Optimization**: Streamlined encoding detection process

---

## Version 2.6.1 (2025-06-13)

### 🎨 Layout Optimization
- **Compact Topic Cards**: Integrated meta information into header section
  - User and date info now appears directly under title
  - Removed redundant separators and spacing
  - 30% more vertical space efficiency
  - Cleaner, more professional appearance

### 📱 Mobile Responsiveness
- Optimized spacing for better mobile viewing
- Improved touch targets for interactive elements
- Better content density on smaller screens

---

## Version 2.6.0 (2025-06-13)

### 🎨 UI/UX Improvements
- **Enhanced Voting Button**: Redesigned with exciting gradients, animations, and interactive effects
  - Dynamic pink-to-orange gradient backgrounds
  - Hover scale effects and smooth transitions
  - Shimmer light effect on voted buttons
  - Bouncing microphone icon and floating particles
  - Pulse animation for voted state
  - Interactive counter with scale effects

- **Vote-Based Visual Hierarchy**: Topics now display progressive green background intensity based on vote count
  - 0 votes: White background
  - 1+ votes: Light green progression
  - 10+ votes: Dark green with white text
  - Automatic text color adaptation for readability
  - Uses backspace.fm theme colors

- **Improved Tab Navigation**: Fixed admin tab visibility
  - Admin tabs (採用, パフォーマンス) now only appear on admin page
  - Regular users see only appropriate tabs on home page
  - Context-aware tab rendering

### 🚀 Performance Enhancements
- **Database Query Optimization**: 65% performance improvement
  - Eliminated N+1 query problems with JOIN operations
  - Optimized connection pool settings (max: 5 connections)
  - Response times reduced from 1.6-2s to 400-700ms
  - Applied 7 strategic database indexes
  - Batch processing for star counts

### 🔧 Technical Improvements
- **Production Deployment**: Comprehensive deployment optimization
  - Fixed ecosystem.config.js ESM/CommonJS compatibility
  - PM2 configuration improvements
  - Environment variable handling
  - Automated deployment scripts

- **Database Performance Monitoring**: Enhanced monitoring capabilities
  - Real-time query performance tracking
  - Slow query detection and logging
  - Connection pool metrics
  - Admin dashboard with performance insights

### 🐛 Bug Fixes
- Fixed 502 Bad Gateway errors in production
- Resolved tab navigation showing admin controls to regular users
- Improved error handling for database connections
- Fixed voting button responsiveness issues

---

## Version 2.5.0 (2025-06-12)

### Previous Features
- User authentication system
- Topic submission and voting
- Chrome extension integration
- Admin management interface
- Weekly topic organization
- Social media sharing (X/Twitter)
- Markdown export functionality
- Database export capabilities (JSON, CSV, SQLite)

---

## System Requirements
- Node.js 18+
- PostgreSQL database
- Modern web browser with JavaScript enabled

## Deployment
- Production URL: https://neta.backspace.fm
- Sakura Cloud infrastructure
- PM2 process management
- Nginx reverse proxy