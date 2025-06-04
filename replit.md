# Podcast Topic Suggestion System (v1.9.0)

## Overview

This system allows users to submit topics for a podcast (specifically backspace.fm), vote on them, add comments, and helps podcast hosts organize and prioritize content. The application follows a client-server architecture with React frontend and Express backend, storing data in a PostgreSQL database via Drizzle ORM.

## Latest Updates (v1.9.0 - June 4, 2025)

- **Enhanced Security**: Admin-only tabs (deleted topics, performance monitoring) now properly restricted to authenticated administrators
- **Performance Improvements**: Database query caching system with 30-second TTL for faster topic loading
- **UI Improvements**: Optional description field, ear icon for "聞きたい" button for better semantic representation
- **System Monitoring**: Real-time performance dashboard with cache statistics and memory usage monitoring

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Technology**: React with TypeScript
- **UI Framework**: Custom components based on Radix UI primitives styled with Tailwind CSS using the shadcn/ui component system
- **State Management**: React Query for server state management
- **Routing**: Wouter for lightweight client-side routing

The frontend is built as a single-page application (SPA) that communicates with the backend API. It uses a component-based architecture with reusable UI components.

### Backend Architecture

- **Technology**: Node.js with Express
- **API Style**: RESTful API endpoints
- **Runtime**: TypeScript with tsx for development and esbuild for production builds
- **Authentication**: Session-based authentication with Passport.js

The server handles API requests, manages database operations through Drizzle ORM, and serves the static frontend assets in production.

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with a schema-first approach
- **Schema**: Defined in shared/schema.ts for type safety across frontend and backend

## Key Components

### Database Schema

The database has the following main tables:
- `users`: Admin users who can manage topics
- `weeks`: Weekly periods for grouping topics
- `topics`: Submitted content suggestions
- `stars`: User votes on topics
- `comments`: User comments on topics

### Client Components

1. **Pages**:
   - Home: Displays topics for the current week
   - Submit: Form for submitting new topics
   - Archive: View topics from past weeks
   - Admin: Admin dashboard for managing topics

2. **Core Components**:
   - TopicCard: Main component for displaying topic information
   - CommentsList/CommentForm: For topic discussion
   - AdminControls: Topic management for admins
   - MarkdownExport: Export topics in markdown format

3. **UI Components**:
   - Extensive collection of shadcn/ui components adapted from Radix UI

### Server Components

1. **Routes**: API endpoints for topics, comments, weeks, and authentication
2. **Storage**: Data access layer for database operations
3. **Authentication**: Session management and user authentication

## Data Flow

1. **Topic Submission Flow**:
   - User submits a topic through the form
   - Backend validates and stores in the database
   - Topics appear on the home page for the current week

2. **Voting/Star Flow**:
   - Users can star topics they like
   - A fingerprint-based system prevents duplicate votes
   - Topics display their star count

3. **Admin Flow**:
   - Admins log in through the admin panel
   - Can approve, feature, or reject topics
   - Can export topics for the podcast show notes

4. **Comment Flow**:
   - Users can comment on topics
   - Comments are displayed under the respective topic

## External Dependencies

### Frontend Dependencies
- React and React DOM
- React Query for data fetching
- Radix UI primitives for accessible components
- Tailwind CSS for styling
- Wouter for routing
- Lucide for icons
- React Hook Form for form handling
- Zod for validation

### Backend Dependencies
- Express for the server framework
- Drizzle ORM for database operations
- Passport.js for authentication
- Memorystore for session storage

## Deployment Strategy

The application is configured for deployment on Replit with the following workflow:

1. **Development Mode**:
   - `npm run dev` runs the server and client in development mode
   - Vite handles hot module replacement for the frontend

2. **Production Build**:
   - `npm run build` builds both client and server
   - Client is built with Vite
   - Server is bundled with esbuild

3. **Production Run**:
   - `npm run start` runs the production build
   - The Express server serves both the API and static frontend assets

4. **Database Management**:
   - `npm run db:push` applies schema changes to the database
   - The application uses PostgreSQL accessed via environment variables

## Database Setup

The application requires PostgreSQL, configured via the `DATABASE_URL` environment variable. When setting up the project, ensure:

1. PostgreSQL is available (Replit provides this)
2. The `DATABASE_URL` environment variable is set correctly
3. Run `npm run db:push` to set up the initial schema

## Important Notes

- Authentication uses a simple username/password system for admins
- User identification for voting uses a browser fingerprint stored in localStorage
- The application supports Japanese language interface