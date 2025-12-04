# TuneLink Backend

REST API Backend für TuneLink - eine Musik-Sharing-Plattform. Dieses Repository ist das Backend des [TuneLink Hauptprojektes](https://github.com/timex05/tunelink).

## Über das Projekt

TuneLink Backend ist eine Express.js-basierte API, die die Verwaltung von Benutzern, Musik-Links, Likes und Kommentaren ermöglicht. Es verwendet Prisma ORM für die Datenverwaltung und MySQL als Datenbank.

## Features

- Benutzerauthentifizierung mit JWT und Google OAuth
- Verwaltung von Linktrees (Sammlungen von Musik-Links)
- Social-Features wie Likes und Kommentare
- Newsletter-Abonnement und Verwaltung
- Sichere Passwort-Verwaltung mit bcryptjs
- Email-Versand über Nodemailer

## Voraussetzungen

- Node.js 16 oder höher
- MySQL 8.0 oder höher
- npm oder yarn

## Installation

```bash
git clone https://github.com/timex05/tunelink-backend.git
cd tunelink-backend

npm install
```

## Konfiguration

Erstelle eine `.env` Datei im Root-Verzeichnis:

```env
DATABASE_URL="mysql://user:password@localhost:3306/tunelink"
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=465
MAIL_ADRESS="your-email@gmail.com"
MAIL_APP_PASSWORD="your-app-password"
PORT=3000
APP_NAME="TuneLink"
```
siehe `.env.example`

## Datenbank Setup

```bash
npx prisma migrate dev
npx prisma studio
```

## Server starten

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

Der Server läuft unter `http://localhost:3000`

## API Endpoints

siehe [Api Definition](https://docs.google.com/spreadsheets/d/1MEDP5qnZL-Q-OhINgiMkZLSXgupkBGDNylVWDLD2SP0/edit?usp=sharing)

## Authentifizierung

Die API verwendet JWT Token für die Authentifizierung. Token können über folgende Methoden übergeben werden:

- `token` Query Parameter
- `token` im Request Body

Die Token-Gültigkeitsdauer beträgt 24 Stunden.

## Sicherheit

- Passwörter sind mit bcryptjs verschlüsselt
- JWT Token für stateless Authentifizierung
- CORS konfiguriert
- Helmet für Security Headers
- OAuth2 Google Integration

## Lizenz

ISC

## Siehe auch

- [TuneLink Frontend](https://github.com/timex05/tunelink-frontend)
- [TuneLink Hauptprojekt](https://github.com/timex05/tunelink)
