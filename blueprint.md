Appointment Slot Recovery App – Product & Technical Specification
1. Purpose

Build a web application that helps businesses recover empty appointment slots by allowing them to publish available time slots as shareable links. Clients can select a service option and book from remaining availability. The system also handles pre-appointment confirmation to reduce no-shows.

2. User Roles
A. Business User (Admin / Owner / Staff)

Creates service options (image, title, description)

Defines available time slots for each option

Shares booking links with clients

Manages working hours and blocked times

Controls reminder + confirmation behavior

B. Client (End User)

Opens booking link

Selects service option

Picks date/time

Confirms attendance via reminder link

3. Page-by-Page Breakdown
3.1 Auth Pages (Clerk)
/sign-in

Email / social login

Managed by Clerk

/sign-up

Business account creation

Onboarding redirect to dashboard

3.2 User Panel (Dashboard Area)
/dashboard – Main Overview

Purpose:

Quick view of today’s appointments

Empty slots

Upcoming confirmations pending

KPIs: no-show rate, fill rate

Components:

Calendar summary

Empty slot counter

“Share booking link” button

/dashboard/options – Service Options Management

Purpose:

Define what clients can book

Each option contains:

Image

Title

Description

Duration (important for scheduling logic)

Active / inactive toggle

Actions:

Create option

Edit option

Delete option

/dashboard/availability – Time Slot Scheduling

Purpose:

Define when each option is available

Features:

Weekly recurring schedule (e.g. Mon–Fri 10:00–18:00)

Option-based availability (e.g. Laser only on Tue/Thu)

Slot duration auto-calculated from option duration

UI:

Grid or calendar view

Drag to add/remove slots

Mobile-friendly

/dashboard/blocks – Blocked Time Management

Purpose:

Allow user to block specific hours on specific dates

Examples:

“Block 14:00–16:00 on Jan 20”

“Block entire day on Jan 25”

Features:

Date picker

Time range selector

Reason (optional)

/dashboard/settings – Appointment Parameters

Purpose:
Global defaults for booking behavior:

Settings:

How many hours before appointment confirmation is required

Confirmation deadline (e.g. must confirm 3h before)

Auto-cancel if not confirmed (on/off)

Buffer time between appointments

Max appointments per day

/dashboard/links – Shareable Links

Purpose:

Generate booking links for:

All options

Specific option

Limited time campaign

Each link:

Public

Can be enabled/disabled

Can have expiration date

3.3 Client Flow Pages
/book/[linkId] – Option Selection

Purpose:

Show grid of cards (options)

Each card:

Image

Title

Description

Duration

Action:

Client selects an option

/book/[linkId]/schedule – Date & Time Picker

Purpose:

Show available slots for selected option

Features:

Calendar view

Disable unavailable dates

Real-time slot availability

Mobile-first UI

Action:

Client picks date + time

Enters name + phone/email

Confirms booking

/confirm/[token] – Attendance Confirmation Page

Purpose:

Linked from SMS/email reminder

Behavior:

“Yes, I will attend” button

If clicked → appointment confirmed

If not clicked before deadline → auto-cancel + slot freed

4. System Behavior (Core Logic)
Booking

Only available slots are shown

Slot is locked during booking flow

On success → saved as “pending confirmation”

Confirmation

X hours before appointment:

Message sent (via Twilio later)

Contains confirmation link

If not confirmed before deadline:

Appointment canceled

Slot returned to availability pool

5. Technical Stack
Frontend

Next.js (App Router)

shadcn/ui for components

Tailwind CSS

Mobile-first responsive design

Backend

NestJS

REST or GraphQL API

Validation via class-validator

Auth

Clerk

Database

PostgreSQL

TypeORM as ORM

Messaging (prepared, not implemented)

Twilio integration layer (interface + service stub)

Infrastructure

Docker

Caddy as reverse proxy


Use latest packages becareful of incompatible packages always install latest.