# Netaspace (Backspace.fm Topic Manager)

## Overview

Netaspace is a podcast topic management platform for backspace.fm that enables community-driven content discovery through an interactive web interface and Chrome extension. The application allows users to submit, vote on, and manage podcast topics organized by weekly cycles.

## System Architecture

The system follows a modern full-stack architecture with clear separation between frontend, backend, and data layers:

- **Frontend**: React 18 + TypeScript SPA with Vite build tooling
- **Backend**: Express.js Node.js server with RESTful API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Build System**: Vite for frontend bundling, ESBuild for backend compilation
- **Process Management**: PM2 for production process management
- **Web Server**: Nginx as reverse proxy and static file server

## Key Components

### Frontend Architecture
- **Framework**: React 18 with functional components and hooks
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI primitives with Shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Server Framework**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL adapter
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed session store
- **File Processing**: URL metadata extraction with JSDOM
- **Performance Monitoring**: Custom query performance tracking

### Database Schema
Core entities with optimized indexing:
- `users`: Admin authentication and user management
- `weeks`: Weekly podcast cycles with active/inactive status
- `topics`: User-submitted topics with metadata and status tracking
- `stars`: Vote/like system linked to user fingerprints
- `sessions`: Session management for authentication persistence

## Data Flow

1. **Topic Submission**: Users submit topics via web interface or Chrome extension
2. **Metadata Extraction**: Server automatically extracts title/description from submitted URLs
3. **Community Voting**: Anonymous voting system using browser fingerprinting
4. **Admin Management**: Authenticated admins can manage topics and weeks
5. **Real-time Updates**: Client polls for updates using TanStack Query with optimistic updates

## External Dependencies

### Database
- **Production**: Neon PostgreSQL (serverless PostgreSQL service)
- **Development**: Local PostgreSQL via Docker Compose
- **Connection Pooling**: Node.js pg Pool with optimized connection management

### Chrome Extension
- Separate extension codebase for easy topic submission from any webpage
- Communicates with main API for seamless integration

### UI Libraries
- Radix UI for accessible component primitives
- Tailwind CSS for utility-first styling
- Inter font family for consistent typography

## Deployment Strategy

### Development Environment
- **Local Development**: Docker Compose for PostgreSQL + Node.js development server
- **Docker-First Approach**: All local development requires Docker for consistency
- **Hot Reloading**: Vite HMR for frontend, tsx watch mode for backend

### Production Environment
- **Platform**: Ubuntu server on Sakura Cloud (Japanese cloud provider)
- **Process Management**: PM2 with cluster mode and automatic restarts
- **Web Server**: Nginx reverse proxy with SSL termination
- **Database**: Neon PostgreSQL with optimized connection pooling
- **Domain**: neta.backspace.fm with SSL via Let's Encrypt

### Performance Optimizations
- Database indexing on frequently queried columns
- Connection pool optimization for remote database
- N+1 query elimination using JOIN operations
- URL metadata caching to reduce external API calls
- Rate limiting to prevent abuse

## Changelog

- June 20, 2025. Initial setup
- June 20, 2025. Migration from Replit Agent to standard Replit environment completed
- June 20, 2025. YouTube live video integration added - displays backspace.fm latest live/scheduled videos above tab navigation
- June 20, 2025. Host configuration optimized for Replit deployment compatibility
- June 21, 2025. YouTube live video display/hide toggle functionality implemented with localStorage persistence

## User Preferences

Preferred communication style: Simple, everyday language.