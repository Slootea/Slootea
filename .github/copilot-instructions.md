# Slootea - AI Coding Agent Instructions

## Project Overview
Appointment slot recovery SaaS: businesses publish shareable booking links, clients select services/times, confirmation system reduces no-shows. Multi-tenant architecture with Clerk organizations.

## Architecture

### Monorepo Structure
- **backend/** - NestJS 11 REST API (port 3001, hosted at `api.slootea.com`)
- **frontend/** - Next.js 15 + React 19 App Router (port 3000)
- **Docker Compose** orchestrates: PostgreSQL, backend, frontend, Caddy reverse proxy

### Key Data Flow
1. Organizations contain users (providers) who offer services
2. Booking links are organization-scoped, not user-scoped
3. Public booking: client → booking link → slot selection → appointment created → notification sent
4. Provider assignment uses load balancing (least appointments that day)

### Multi-Tenant Model
- Clerk handles auth + organizations (`org:admin`, `org:member` roles)
- Backend syncs Clerk users to PostgreSQL on every authenticated request (see `ClerkAuthGuard`)
- Organization context passed via `x-organization-id` header
- Use `@CurrentOrganization()` decorator to extract org ID in controllers

## Backend Patterns

### Module Structure (NestJS)
```
modules/{feature}/
├── {feature}.module.ts      # Module definition
├── {feature}.controller.ts  # REST endpoints
├── {feature}.service.ts     # Business logic
├── dto/                     # class-validator DTOs with @ApiProperty
└── entities/                # TypeORM entities
```

### Entity Conventions
- Use `@PrimaryGeneratedColumn('uuid')` for all IDs
- Timestamps: `@CreateDateColumn()`, `@UpdateDateColumn()`
- Relations use `onDelete: 'CASCADE'` or `'SET NULL'`
- Enums defined in entity file (e.g., `AppointmentStatus`)

### DTO Pattern
```typescript
// Always use class-validator + Swagger decorators
export class CreateFeatureDto {
  @ApiProperty({ description: '...' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  optionalField?: string;
}
```

### Protected Routes
- Apply `@UseGuards(ClerkAuthGuard)` on controllers
- For org-admin-only: add `@UseGuards(ClerkAuthGuard, OrgRolesGuard)` + `@OrgRoles('org:admin')`
- Public endpoints go in `PublicModule` (no guards)

### Timezone Handling
All slot calculations use organization timezone (stored in settings). Key helpers in `appointments.service.ts`:
- `formatDateInTimezone()` - YYYY-MM-DD in org timezone
- `getDayOfWeekInTimezone()` - 0=Monday
- `createDateInTimezone()` - creates UTC Date from local time string

## Frontend Patterns

### API Client
[src/lib/api.ts](frontend/src/lib/api.ts) - Axios instance with typed API methods:
```typescript
// Auth token set automatically via AuthProvider
// Organization header set automatically via useEffect

// Usage in components:
const { data } = await appointmentsApi.getAll({ page: 1, status: 'confirmed' });
```

### Provider Hierarchy (layout.tsx)
```
ClerkProvider → ThemeProvider → NextIntlClientProvider → LocaleProvider
  → AuthProvider → OrganizationProvider → {children}
```
- `AuthProvider` syncs Clerk token to axios
- `OrganizationProvider` provides `useOrganizationContext()` hook

### i18n (next-intl)
- Locales: `en`, `tr` (see [src/i18n/config.ts](frontend/src/i18n/config.ts))
- Messages in `src/i18n/messages/{locale}.json`
- Use `useTranslations('namespace')` in components

### UI Components
shadcn/ui in [src/components/ui/](frontend/src/components/ui/) - don't modify these directly. Create wrapper components for custom behavior.

### Route Structure
- `/dashboard/*` - Protected business dashboard
- `/book/[linkId]/*` - Public booking flow
- `/confirm/[token]` - Appointment confirmation
- `/admin/*` - Platform admin (separate from org admin)

## Commands

### Development
```bash
# Backend
cd backend && npm run start:dev

# Frontend  
cd frontend && npm run dev

# Full stack via Docker
docker-compose up -d
```

### Database
```bash
# TypeORM synchronize is ON in dev (auto-creates tables)
# For production migrations:
cd backend
npm run migration:generate -- -n MigrationName
npm run migration:run
```

### API Docs
Swagger available at `http://localhost:3001/docs` when backend running (or `https://api.slootea.com/docs` in production).

## Critical Conventions

1. **Appointment Status Flow**: `pending_confirmation` → `confirmed` → `completed` (or `cancelled`/`no_show`)
2. **Buffer Time**: Applied BEFORE and AFTER appointments during availability checks
3. **Provider Selection**: When `allowProviderSelection=false`, system auto-assigns via load balancing
4. **Notifications**: Sent via `NotificationService` - supports WhatsApp (Meta API), email, SMS (Twilio stub)
5. **Client Deduplication**: Clients identified by phone number within organization

## Environment Variables
Key vars needed (see `.env.example`):
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` - Auth
- `DATABASE_*` - PostgreSQL connection
- `OPENAI_API_KEY` - AI assistant feature
- `META_APP_*`, `TWILIO_*` - Notifications (optional)
