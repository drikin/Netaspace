# Backspace.fm Topic Management Platform

A podcast topic management web application with community-driven content discovery. Features React frontend, Express backend, PostgreSQL database, and Chrome extension integration.

## Features

- Topic submission and voting system
- Admin dashboard for content moderation
- Chrome extension for seamless topic submission
- Real-time updates via WebSocket
- Japanese language support
- Performance monitoring and caching

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket integration
- **Authentication**: Passport.js with session management

## Quick Start

```bash
npm install
npm run dev
```

The application runs on port 5000 with both frontend and backend served together.

## Project Structure

```
├── client/           # React frontend
├── server/           # Express backend  
├── shared/           # Shared schemas and types
├── chrome-extension/ # Chrome extension
└── database/         # SQLite database
```

## Chrome Extension

Install from `chrome-extension/` directory to submit topics directly from web pages with auto-extracted metadata.

## API Overview

**Public**: `/api/weeks/active`, `/api/topics`, `/api/topics/:id/star`
**Admin**: `/api/admin/weeks`, `/api/admin/topics/:id/status`, `/api/metrics`

## Performance

- URL metadata caching (24h TTL)
- Rate limiting (30 req/min per IP)  
- React Query client-side caching
- SQLite with optimized queries

## License

MIT