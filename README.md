# Appointment Slot Recovery App

A web application for businesses to publish available appointment slots as shareable links, enabling clients to book, confirm attendance, and help recover potentially empty slots.

## Features

- **Service Options Management**: Define services with duration and descriptions
- **Weekly Availability**: Set recurring availability schedules
- **Blocked Times**: Block specific dates/times as unavailable
- **Shareable Booking Links**: Create public links for clients to book
- **Appointment Management**: Track, confirm, and manage appointments
- **Confirmation System**: Pre-appointment confirmation to reduce no-shows
- **Dashboard Analytics**: View stats on appointments and fill rates

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, shadcn/ui components
- **Backend**: NestJS 11, TypeORM, PostgreSQL
- **Authentication**: Clerk
- **Infrastructure**: Docker, Caddy reverse proxy

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- A Clerk account (https://clerk.dev)

## Quick Start

### 1. Clone and Configure

```bash
cd AppointmentApp
cp .env.example .env
```

### 2. Set Environment Variables

Edit `.env` with your Clerk credentials:

```env
# Clerk Authentication
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# Database (defaults work with Docker)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=appointment_user
DATABASE_PASSWORD=appointment_pass
DATABASE_NAME=appointment_db

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run with Docker

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database (port 5432)
- NestJS backend (port 3001)
- Next.js frontend (port 3000)
- Caddy reverse proxy (port 80)

### 4. Access the Application

- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- Via Caddy: http://localhost

## Development Setup

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
AppointmentApp/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── appointments/    # Appointment CRUD & booking
│   │   │   ├── auth/            # Clerk authentication guard
│   │   │   ├── availability/    # Weekly schedule management
│   │   │   ├── blocked-times/   # Time blocking
│   │   │   ├── booking-links/   # Shareable link generation
│   │   │   ├── messaging/       # Twilio SMS stub
│   │   │   ├── public/          # Public booking endpoints
│   │   │   ├── service-options/ # Service definitions
│   │   │   ├── settings/        # Business settings
│   │   │   └── users/           # User management
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── Dockerfile
├── frontend/                # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/       # Protected dashboard pages
│   │   │   ├── book/[linkId]/   # Public booking flow
│   │   │   ├── confirm/[token]/ # Confirmation page
│   │   │   └── sign-in/         # Auth pages
│   │   ├── components/ui/       # Reusable UI components
│   │   └── lib/                 # API client & utilities
│   └── Dockerfile
├── docker-compose.yml
├── Caddyfile
└── blueprint.md
```

## API Endpoints

### Protected Endpoints (require authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/service-options | List all service options |
| POST | /api/service-options | Create service option |
| PUT | /api/service-options/:id | Update service option |
| DELETE | /api/service-options/:id | Delete service option |
| GET | /api/availability | List availability slots |
| POST | /api/availability | Create availability |
| POST | /api/availability/bulk | Bulk create availability |
| DELETE | /api/availability/:id | Delete availability |
| GET | /api/blocked-times | List blocked times |
| POST | /api/blocked-times | Create blocked time |
| DELETE | /api/blocked-times/:id | Delete blocked time |
| GET | /api/booking-links | List booking links |
| POST | /api/booking-links | Create booking link |
| PUT | /api/booking-links/:id | Update booking link |
| DELETE | /api/booking-links/:id | Delete booking link |
| GET | /api/appointments | List appointments |
| GET | /api/appointments/stats | Get dashboard stats |
| PUT | /api/appointments/:id | Update appointment |
| PUT | /api/appointments/:id/cancel | Cancel appointment |
| GET | /api/settings | Get business settings |
| PUT | /api/settings | Update business settings |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/public/book/:slug | Get booking link details |
| GET | /api/public/book/:slug/slots | Get available time slots |
| POST | /api/public/book/:slug | Book an appointment |
| GET | /api/public/confirm/:token | Get appointment for confirmation |
| POST | /api/public/confirm/:token | Confirm attendance |

## Database Schema

### Entities

- **User**: Business owner account linked to Clerk
- **ServiceOption**: Available services (title, duration, description, image)
- **Availability**: Weekly recurring time slots
- **BlockedTime**: Exceptions to availability (vacations, holidays)
- **BookingLink**: Shareable URLs with unique slugs
- **Appointment**: Booked appointments with client info
- **BusinessSettings**: Configuration (confirmation hours, buffer time, etc.)

## Configuration Options

Business settings can be configured in the dashboard:

- **Confirmation Required Hours**: Hours before appointment to send confirmation
- **Confirmation Deadline Hours**: Hours before appointment for deadline
- **Auto Cancel Unconfirmed**: Automatically cancel unconfirmed appointments
- **Buffer Time**: Minutes between appointments
- **Max Appointments Per Day**: Daily limit
- **Min Advance Booking Hours**: Minimum notice for bookings
- **Max Advance Booking Days**: How far ahead clients can book

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
```

### Using Docker in Production

Update `Caddyfile` with your domain:

```
yourdomain.com {
    reverse_proxy /api/* backend:3001
    reverse_proxy frontend:3000
}
```

Then deploy:

```bash
docker-compose -f docker-compose.yml up -d
```

## License

MIT
# Appointment_APP
