# CalTrack — Product & Technical Specification

PWA • React (TypeScript) • FastAPI (Python) • PostgreSQL • Docker • TDD

---

# 1. Product Overview

CalTrack is a Progressive Web App that gives users a **simple daily calorie approximation**.

It is not a medical tool.  
Its goal is clarity, not precision.

The app tells the user:

- Where they stand today (Deficit / Maintenance / Surplus)
- Their estimated daily goal
- What they consumed
- What they burned
- Historical monthly trend

Supports:
- English (LTR)
- Hebrew (RTL)

---

# 2. Core Philosophy

- Clean architecture
- Predictable state
- No inconsistent calorie state
- Validation protects data integrity
- Daily reset must not erase history
- Prefer clarity over cleverness
- TDD mandatory (tests written before implementation)

---

# 3. User Flow

## 3.1 Onboarding Questionnaire (Mandatory)

User must complete:

- Height
- Weight
- Age
- Gender
- Activity baseline (sedentary / light / moderate / active)
- Goal (lose / maintain / gain)

System calculates:

- BMR (Mifflin-St Jeor)
- TDEE
- Daily calorie target

Profile saved in database.

---

## 3.2 Daily Dashboard

Main screen displays:

- Daily target
- Calories consumed
- Calories burned
- Net calories
- Status:
  - In Deficit
  - Maintenance
  - Surplus

Clean minimal UI using ShadCN.  
No heavy styling frameworks.

---

## 3.3 Food Logging (3 Options)

### A. Structured Input
- Food name
- Portion
- Estimated calories

### B. Free Text Input
- User types what they ate
- Backend estimates calories (simple approximation logic)

### C. Image Upload
- Upload picture
- Backend approximates calories (basic logic, extendable later)

### D. Record Upload
- Upload Record 
- Backend deciphers it into text
- Backend approximates calories (basic logic, extendable later)


Each entry stores:

- Date
- Time
- Calories
- Input type

---

## 3.4 Exercise Logging

User inputs:

- Exercise type
- Duration
- Intensity (optional)

Backend estimates calories burned.

Stored with:

- Date
- Estimated burn

---

## 3.5 Daily Reset

At 00:00 (user timezone):

- New daily record created
- Counters reset
- Previous day preserved

No duplicate daily logs allowed.

---

## 3.6 History

User can:

- View daily summaries
- View monthly overview
- See deficit/surplus trend

---

# 4. Technical Architecture

## 4.1 Frontend

- React
- TypeScript
- Vite
- PWA support
- i18n (react-i18next)
- RTL support
- ShadCN UI
- Framer Motion (minimal)

State:
- React Query (server state)
- Zustand (local UI state)

Validation:
- Zod

Testing:
- Vitest
- React Testing Library
- Playwright (E2E)

---

## 4.2 Backend

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic (migrations)
- JWT authentication

Testing:
- Pytest
- FastAPI TestClient

---

## 4.3 Database (PostgreSQL)

### users
- id
- email
- password_hash
- created_at

### profiles
- user_id
- height
- weight
- age
- gender
- activity_level
- goal
- bmr
- tdee
- daily_target

### daily_logs
- id
- user_id
- date
- total_consumed
- total_burned
- net_calories
- status

### food_entries
- id
- daily_log_id
- name
- calories
- input_type
- created_at

### exercise_entries
- id
- daily_log_id
- type
- duration
- calories_burned
- created_at

---

# 5. API Endpoints

## Auth
- POST /register
- POST /login

## Profile
- POST /profile
- GET /profile

## Daily
- GET /daily
- POST /daily/food
- POST /daily/exercise
- GET /daily/history

---

# 6. PWA Requirements

- Installable
- Service worker
- Offline food/exercise logging
- Background sync
- Manifest configuration
- Daily reset handled server-side

---

# 7. Docker Setup

## Services

- frontend
- backend
- postgres

## docker-compose.yml includes:

- DATABASE_URL
- JWT_SECRET
- ENV
- Volume for pgdata

---

# 8. Core Integrity Rules

- Daily log must exist before entries
- Profile required before daily calculation
- One daily log per user per date
- Reset cannot create duplicates
- All entries tied to correct date

---

# 9. TDD Development Order

1. Auth tests
2. Profile tests
3. BMR calculation tests
4. Daily log creation tests
5. Food entry update tests
6. Exercise update tests
7. Status calculation tests
8. Midnight reset tests
9. History tests
10. Frontend onboarding tests
11. Dashboard tests
12. E2E flow tests
13. PWA tests

No feature implemented without tests.

---

# 10. Definition of Done

A feature is complete only if:

- Tests written first
- All tests pass
- No inconsistent state possible
- Both languages working
- RTL fully functional
- Docker builds successfully
- PWA installable
- No duplicated daily logs  
