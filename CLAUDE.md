# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Working Guidelines

**IMPORTANT: Always use Thinking mode when analyzing code, planning solutions, or making decisions.** Use <thinking> tags to show your reasoning process before taking actions.

**CRITICAL: Prevent regressions and unauthorized changes:**
- NEVER make changes that are not explicitly requested by the user
- ALWAYS test existing functionality before making any changes
- DO NOT modify working code unless specifically asked to do so
- ONLY fix the exact issue described by the user
- AVOID "improving" or "optimizing" code that is not broken
- PRESERVE all existing functionality when making changes

## Project Overview

Netaspace is a podcast topic management platform for backspace.fm that enables community-driven content discovery through an interactive web interface and Chrome extension. It's built with React/TypeScript frontend, Express.js backend, and PostgreSQL database.

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Wouter routing
- **Backend**: Express.js server with session-based authentication  
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite for frontend, ESBuild for backend
- **UI Components**: Radix UI + Shadcn/ui components
- **State Management**: TanStack Query for server state

### Key Directory Structure
```
client/           # React frontend application
server/           # Express.js backend API
shared/           # Shared types and database schema
chrome-extension/ # Browser extension for topic submission
```

### Database Schema
Core entities: `users`, `weeks`, `topics`, `stars`, `sessions`
- Topics belong to weeks and can receive stars from users
- User identification via fingerprinting (no registration required)
- Admin authentication for management functions

## Development Commands

### Local Development Setup (IMPORTANT)
**ALWAYS use Docker for local development on macOS and Linux:**

```bash
# Required for all local development
docker-compose up -d     # Start PostgreSQL and app containers
npm run db:docker        # Setup database schema
npm run setup:local      # Initialize development data

# Application will be available at http://localhost:3000
```

**DO NOT use `npm run dev` directly** - always use Docker environment for consistency.

### Essential Commands
```bash
npm install          # Install dependencies
docker-compose up -d # Start development server (Docker)
npm run build        # Build both frontend and backend
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push database schema changes
```

### Database Commands
```bash
npm run db:docker    # Apply schema changes to Docker database
npm run db:push      # Apply schema changes to database
```

## Production Deployment

### Automated Deployment
```bash
./deploy.sh          # Standard deployment
./deploy.sh --initial # Initial server setup with system dependencies
```

### Manual Production Commands
```bash
npm run build        # Build application
pm2 start ecosystem.config.js  # Start with PM2
pm2 logs neta-app    # View application logs
pm2 restart neta-app # Restart application
```

### Health Monitoring
```bash
curl -I https://neta.backspace.fm/health  # Check application health
pm2 status           # Check PM2 process status
```

## Key Configuration Files

- `ecosystem.config.js` - PM2 production configuration with environment variables
- `drizzle.config.ts` - Database configuration
- `vite.config.ts` - Frontend build configuration with path aliases
- `tsconfig.json` - TypeScript configuration with monorepo paths

## Path Aliases
- `@/*` - Maps to `client/src/*`
- `@shared/*` - Maps to `shared/*`

## Authentication
- Admin credentials: username `admin`, password set via `ADMIN_PASSWORD` environment variable
- Session-based authentication with PostgreSQL session store
- User identification via browser fingerprinting for anonymous interactions

## API Architecture
- Public endpoints: topic submission, voting, week data
- Admin endpoints: user management, topic moderation, week management
- All API routes in `server/routes.ts`
- Database queries in `server/storage.ts`

## Production Environment
- Server runs on port 5000 internally
- Nginx proxy with SSL termination
- PM2 process management with cluster mode
- PostgreSQL database on Neon platform
- **IMPORTANT: Production does NOT use Vite** - serves pre-built static files from `dist/` directory