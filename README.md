# Backspace.fm Topic Manager

A comprehensive podcast topic management platform for backspace.fm that enables community-driven content discovery through an interactive web interface and Chrome extension.

## Version 2.4.0 - Persistent Storage Edition

### Key Features

- **Persistent Data Storage**: Complete protection against deployment data loss
- **Community Topic Submission**: Users can submit podcast topic suggestions
- **Weekly Topic Management**: Organize topics by weekly episodes
- **Star Rating System**: Community feedback and topic popularity tracking
- **Administrative Controls**: Full topic approval and management workflow
- **Chrome Extension**: Direct topic submission from any webpage
- **Database Export**: Comprehensive backup and export functionality
- **Real-time Updates**: Live topic status and comment updates

### Recent Major Update: Persistent Storage System

Version 2.4.0 introduces a robust persistent storage system that ensures all data survives Replit redeployments:

- **Zero Data Loss**: All topics, comments, and user interactions preserved
- **Automatic Migration**: Seamless transition from existing data
- **Smart Backup System**: Daily automated backups with admin panel access
- **Fallback Protection**: Multiple storage layers ensure reliability

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Build Tool**: Vite for development and production builds
- **Deployment**: Replit with persistent storage configuration

## Quick Start

### Prerequisites

- Node.js 20+ 
- SQLite3
- Modern web browser

### Installation

1. Clone the repository
2. Install dependencies (automatic on Replit)
3. Start the development server:

```bash
npm run dev
```

### Initial Setup

For production deployment with persistent storage:

```bash
# Setup persistent storage system
node scripts/persistent-storage.js

# Verify setup
node scripts/test-persistent-storage.js
```

## Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── pages/         # Route components
│   │   ├── components/    # Reusable UI components
│   │   └── lib/          # Utilities and API client
├── server/                # Express backend
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared types and schemas
│   ├── schema.ts         # Database schema definitions
│   └── version.ts        # Version management
├── scripts/              # Deployment and maintenance
│   ├── persistent-storage.js
│   ├── test-persistent-storage.js
│   └── deploy-production.js
├── chrome-extension/     # Browser extension
└── data/                # Database and backups
```

## Core Functionality

### Topic Management

- Submit new podcast topic suggestions
- Community star rating system
- Comment and discussion threads
- Administrative approval workflow
- Weekly episode organization

### User System

- Anonymous fingerprint-based tracking
- Administrative user roles
- Secure authentication for admin functions
- Privacy-focused user identification

### Data Export

Multiple export formats available through admin panel:
- JSON format for data interchange
- CSV format for spreadsheet analysis
- SQLite database for full backup
- Automatic backup downloads

## Deployment

### Development

```bash
npm run dev
```

### Production (Replit)

1. Setup persistent storage:
   ```bash
   node scripts/persistent-storage.js
   ```

2. Deploy using Replit's Deploy button

3. Data automatically preserved across deployments

### Database Management

The application uses intelligent database path resolution:

1. **Persistent Storage**: `/tmp/persistent/production.sqlite` (primary)
2. **Fallback Storage**: `./data/production.sqlite` (secondary)
3. **Development**: `./database/dev.sqlite` (local development)

## API Endpoints

### Public APIs

- `GET /api/weeks/active` - Get current active week
- `GET /api/topics` - List topics with filtering
- `POST /api/topics` - Submit new topic
- `POST /api/topics/:id/comments` - Add comment
- `POST /api/topics/:id/star` - Star/unstar topic

### Admin APIs

- `GET /api/admin/stats` - System statistics
- `POST /api/admin/topics/:id/status` - Update topic status
- `GET /api/admin/export` - Database export functionality
- `GET /api/admin/backups` - Backup management

## Security Features

- Fingerprint-based user tracking for privacy
- CSRF protection on all forms
- SQL injection prevention with parameterized queries
- Secure session management
- Rate limiting on topic submissions

## Browser Extension

The Chrome extension enables direct topic submission from any webpage:

- One-click topic submission
- Automatic title and URL extraction
- Settings synchronization
- Seamless integration with main application

## Monitoring and Maintenance

### Health Checks

```bash
# Check database status
sqlite3 /tmp/persistent/production.sqlite ".tables"

# Verify data integrity
node scripts/test-persistent-storage.js

# Check backup status
ls -la /tmp/persistent/backups/
```

### Backup Management

- Automatic daily backups before deployments
- Manual backup creation through admin panel
- Backup download and restoration capabilities
- Automatic cleanup of old backup files

## Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript typing
4. Test thoroughly including database operations
5. Submit pull request

### Code Standards

- TypeScript for all new code
- Proper error handling and validation
- Database operations through Drizzle ORM
- Responsive design with Tailwind CSS
- Component-based architecture

## Troubleshooting

### Common Issues

**Data not persisting after deployment:**
- Run `node scripts/persistent-storage.js`
- Verify `/tmp/persistent/` directory exists
- Check environment variables are properly set

**Topic submission failures:**
- Verify database schema is up to date
- Check fingerprint generation is working
- Ensure all required fields are provided

**Extension not working:**
- Verify extension is loaded and enabled
- Check server URL configuration in extension settings
- Ensure CORS settings allow extension requests

## Support

For technical issues:
1. Check the troubleshooting section
2. Run diagnostic scripts
3. Review server logs for errors
4. Contact system administrator if problems persist

## License

MIT License - see LICENSE file for details

---

Built with ❤️ for the backspace.fm community