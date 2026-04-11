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
- API: http://localhost:3001
- Swagger Docs: http://localhost:3001/docs
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
| GET | /service-options | List all service options |
| POST | /service-options | Create service option |
| PUT | /service-options/:id | Update service option |
| DELETE | /service-options/:id | Delete service option |
| GET | /availability | List availability slots |
| POST | /availability | Create availability |
| POST | /availability/bulk | Bulk create availability |
| DELETE | /availability/:id | Delete availability |
| GET | /blocked-times | List blocked times |
| POST | /blocked-times | Create blocked time |
| DELETE | /blocked-times/:id | Delete blocked time |
| GET | /booking-links | List booking links |
| POST | /booking-links | Create booking link |
| PUT | /booking-links/:id | Update booking link |
| DELETE | /booking-links/:id | Delete booking link |
| GET | /appointments | List appointments |
| GET | /appointments/stats | Get dashboard stats |
| PUT | /appointments/:id | Update appointment |
| PUT | /appointments/:id/cancel | Cancel appointment |
| GET | /settings | Get business settings |
| PUT | /settings | Update business settings |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /public/book/:slug | Get booking link details |
| GET | /public/book/:slug/slots | Get available time slots |
| POST | /public/book/:slug | Book an appointment |
| GET | /public/confirm/:token | Get appointment for confirmation |
| POST | /public/confirm/:token | Confirm attendance |

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
api.yourdomain.com {
    reverse_proxy backend:3001
}

yourdomain.com {
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
