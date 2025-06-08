# Backspace.fm Topic Management Platform

A podcast topic management platform for backspace.fm that enables community-driven content discovery through an interactive web interface and Chrome extension.

## Features

- **Topic Submission & Management**: Community-driven topic submission with admin approval workflow
- **Chrome Extension**: Browser extension for easy topic submission from any webpage
- **Weekly Organization**: Topics organized by weekly episodes with automated week management
- **Interactive Voting**: Star rating system for community feedback
- **Comment System**: Discussion threads for each topic
- **Admin Dashboard**: Comprehensive admin interface for content moderation
- **Data Persistence**: Robust backup system preventing data loss during deployments
- **Release Notes**: Automated release management with user notifications

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + SQLite/PostgreSQL
- **Database ORM**: Drizzle ORM with automatic migrations
- **Query Management**: TanStack Query for efficient data fetching
- **Authentication**: Session-based authentication system
- **Deployment**: Docker + Docker Compose ready

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Deployment

#### Replit Deploy
- Automatic deployment with persistent storage
- Built-in backup system
- Zero-configuration setup

#### Self-Hosted (Docker)
```bash
# Build and start
docker-compose up --build -d

# View logs
docker-compose logs -f
```

#### Sakura Cloud GitHub Deployment
```bash
# One-command deployment from GitHub
curl -fsSL https://raw.githubusercontent.com/yourusername/backspace-fm/main/sakura-github-deploy.sh | bash

# Or manual Docker deployment
git clone https://github.com/yourusername/backspace-fm.git
cd backspace-fm
docker build -t backspace-fm .
docker run -d --name backspace-fm --restart unless-stopped -p 5000:5000 -v /opt/backspace-fm-data:/app/data backspace-fm

# Using Docker Compose
docker-compose -f docker-compose.prod.yml up --build -d
```

## Architecture

### Database Schema
- **Topics**: Core content with URL, description, status
- **Weeks**: Episode organization with date ranges
- **Comments**: Threaded discussions
- **Stars**: Community voting system
- **Users**: Authentication and admin roles

### API Endpoints
- `GET /api/weeks/active` - Current week with topics
- `POST /api/topics` - Submit new topic
- `PATCH /api/topics/:id/status` - Admin topic approval
- `POST /api/comments` - Add comment to topic
- `POST /api/stars` - Vote on topics

### Data Persistence
- Multiple backup locations for reliability
- Automatic hourly backups
- Pre/post deployment data protection
- Cross-environment data migration

## Chrome Extension

The browser extension enables one-click topic submission:

1. Install extension from `chrome-extension/` directory
2. Configure server URL in extension settings
3. Click extension icon on any webpage to submit

## Admin Features

- Topic status management (pending/approved/featured)
- Week creation and management
- User authentication
- Data export capabilities
- System health monitoring

## Configuration

### Environment Variables
```bash
NODE_ENV=production
PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite
BACKUP_DIR=/app/data/backups
```

### Database Options
- **SQLite**: Default, file-based, portable
- **PostgreSQL**: Enterprise-grade, scalable
- **Supabase**: Managed PostgreSQL service

## Backup & Recovery

Automatic backup system with multiple protection layers:

1. **Hourly Backups**: Automatic database snapshots
2. **Deployment Protection**: Pre/post deployment validation
3. **Multiple Locations**: Redundant storage across paths
4. **Recovery Tools**: One-click restore capabilities

## Development

### Project Structure
```
├── client/           # React frontend application
├── server/           # Express backend API
├── shared/           # Shared types and schemas
├── scripts/          # Deployment and utility scripts
├── chrome-extension/ # Browser extension
└── data/            # Database and backups
```

### Key Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Database migration
npm start           # Production server
```

## Deployment Options

### Supported Platforms
- **Replit**: Zero-config deployment
- **Sakura Cloud**: Japanese cloud provider
- **AWS/GCP/Azure**: Major cloud platforms
- **DigitalOcean**: VPS deployment
- **Railway/Render**: Platform-as-a-Service

### Docker Support
Complete containerization with:
- Multi-stage builds for optimization
- Health checks for reliability
- Volume persistence for data
- Automatic service recovery

## Contributing

This is a production application for backspace.fm podcast. The codebase includes comprehensive error handling, data validation, and deployment automation.

## License

MIT License - see LICENSE file for details