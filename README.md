# TuneLink Rest

REST API backend for TuneLink. This repository contains the backend only and is part of the [TuneLink project](https://github.com/timex05/tunelink).

## About

The TuneLink Backend is an Express.js API that manages users, music links (linktrees), likes and comments. It uses Prisma as the ORM and typically runs with a MySQL database.

## Features

- User authentication with JWT and Google OAuth
- Management of linktrees (collections of music links)
- Social features: likes and comments
- Newsletter subscription and management
- Secure password handling with bcryptjs
- Email sending via Nodemailer

## Requirements

- Node.js 16 or newer
- MySQL 8.0 or newer
- npm or yarn

## Installation

```powershell
git clone https://github.com/timex05/tunelink-backend.git
cd tunelink-backend

npm install
```

## Configuration

Create a `.env` file in the repository root. See `.env.example` for required variables.

## Prisma setup

```powershell
npx prisma migrate dev
npx prisma generate
```

## Starting the server

Development:
```powershell
npm run dev
```

Production:
```powershell
npm start
```

The server runs at `http://localhost:3000` by default.

## API Endpoints

[API definition](https://docs.google.com/spreadsheets/d/1MEDP5qnZL-Q-OhINgiMkZLSXgupkBGDNylVWDLD2SP0/edit?usp=sharing)

## Authentication

The API uses JWT for authentication. Tokens can be provided via:

- `token` query parameter
- `token` in the request body

Tokens are typically valid for 24 hours.

## Security

- Passwords are hashed using `bcryptjs`.
- JWT tokens provide stateless authentication.
- CORS is configured.
- `helmet` is used for security headers.
- Google OAuth2 integration is available for sign-in.

## License

ISC

## See also

### Main

- [Main TuneLink project](https://github.com/timex05/tunelink-main)

### Frontend

- [TuneLink Mulit Page Application (mpa)](https://github.com/timex05/tunelink-mpa)
- [TuneLink Single Page Application (spa)](https://github.com/timex05/tunelink-spa)

### Backend

- [TuneLink REST-Api](https://github.com/timex05/tunelink-rest)
