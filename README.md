# Backspace.fm ネタ帳 (Topic Manager) v2.6.1

A podcast topic management platform for backspace.fm that enables community-driven content discovery through an interactive web interface and Chrome extension.

## Version 2.6.1 Features
- **Layout Optimization**: Compact topic cards with integrated meta information
- **Enhanced Interactive Voting**: Stylish gradient buttons with animations and particle effects
- **Visual Vote Hierarchy**: Progressive green backgrounds based on vote popularity
- **Performance Optimized**: 65% faster response times (400-700ms from 1.6-2s)
- **Release Notifications**: Bell notification system for new features and updates

## Production Deployment

**Live Application**: https://neta.backspace.fm/

The production environment runs a complete version with all features:
- Topic submission and management
- Admin authentication system
- URL information extraction
- Star/vote functionality
- Weekly topic organization

### Admin Access
- Username: `admin`
- Password: `fmbackspace55`

### Production Guarantees

The application is configured to always deploy with full functionality:

1. **Automated Deployment**: Use `./deploy-full-production.sh` for reliable deployments
2. **Continuous Monitoring**: `./monitor-production.sh` ensures system health
3. **Service Management**: Systemd service with auto-restart capabilities
4. **Complete Feature Set**: All API endpoints and functionality available

## Features

- **Interactive Web Interface**: Modern React-based UI for topic submission and management
- **Chrome Extension**: Easy topic submission directly from web pages
- **Community Voting**: Star-based voting system for topic popularity
- **Admin Dashboard**: Comprehensive management interface for podcast hosts
- **Week-based Organization**: Topics organized by podcast weeks
- **Responsive Design**: Mobile-friendly interface with Japanese language support

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Wouter (routing)
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Build Tools**: Vite, ESBuild
- **UI Components**: Radix UI, Shadcn/ui
- **State Management**: TanStack Query

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL
   ```

3. **Database Setup**:
   ```bash
   npm run db:push
   ```

4. **Development**:
   ```bash
   npm run dev
   ```

5. **Production Build**:
   ```bash
   npm run build
   ```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Express backend
│   ├── db.ts              # Database connection
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   ├── schema.ts          # Database schema (Drizzle)
│   └── version.ts         # App version info
├── chrome-extension/       # Chrome extension files
└── dist/                  # Build output
```

## Environment Variables

```bash
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development|production
```

## Admin Access

Default admin credentials:
- Username: `admin`
- Password: `fmbackspace55`

## API Endpoints

### Public Endpoints
- `GET /api/version` - Get app version info
- `GET /api/weeks/active` - Get current active week with topics
- `POST /api/topics` - Submit new topic
- `POST /api/topics/:id/star` - Add star to topic
- `DELETE /api/topics/:id/star` - Remove star from topic

### Admin Endpoints
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Admin logout
- `GET /api/weeks` - Get all weeks
- `POST /api/weeks` - Create new week
- `POST /api/weeks/:id/setActive` - Set active week
- `PUT /api/topics/:id/status` - Update topic status
- `DELETE /api/topics/:id` - Delete topic

## Development

### Database Migrations
```bash
npm run db:push  # Push schema changes to database
```

### Building
```bash
npm run build    # Build both frontend and backend
```

## Deployment

The application is designed for deployment on various platforms:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set environment variables**:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV=production`

3. **Start the server**:
   ```bash
   node dist/index.js
   ```

The server serves both the API and static frontend files.

## License

MIT License