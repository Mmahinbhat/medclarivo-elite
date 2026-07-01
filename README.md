# MedClarivo Elite — Auth Backend

Node.js/Express REST API for authentication.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register with email + password |
| POST | `/api/auth/login` | Login with email/phone + password |
| GET | `/api/auth/me` | Get current user (JWT required) |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/apple` | Start Apple Sign-In |
| POST | `/api/auth/apple/callback` | Apple Sign-In callback |
| POST | `/api/auth/logout` | Logout (client discards JWT) |
| GET | `/health` | Health check |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Run in development
npm run dev

# 4. Run in production
npm start
```

## Environment Variables

See `.env.example` for all required variables:
- **MongoDB** — any MongoDB Atlas connection string
- **JWT** — secret key + expiry
- **Google OAuth** — from Google Cloud Console
- **Apple Sign-In** — from Apple Developer account

## Deployment

Recommended: **Railway**, **Render**, or **Fly.io** (all have free tiers).

Set all `.env` variables in the platform's environment settings.
