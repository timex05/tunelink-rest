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

### Benutzer (/api/user)
- `POST /` - Registrierung
- `POST /auth` - Login
- `POST /auth/google` - Google OAuth Login
- `POST /auth/forgot` - Passwort vergessen
- `POST /auth/reset` - Passwort zurücksetzen
- `GET /me` - Eigene Profildaten (Authentifizierung erforderlich)
- `PUT /me` - Profildaten aktualisieren (Authentifizierung erforderlich)
- `GET /:id` - Öffentliches Profil abrufen
- `GET /:id/tree` - Benutzers Linktrees abrufen

### Linktrees (/api/tree)
- `GET /` - Eigene Linktrees (Authentifizierung erforderlich)
- `GET /:id` - Linktree anschauen
- `POST /` - Linktree erstellen (Authentifizierung erforderlich)
- `PUT /:id` - Linktree bearbeiten (Authentifizierung erforderlich)
- `DELETE /:id` - Linktree löschen (Authentifizierung erforderlich)
- `PUT /:id/likes` - Linktree liken (Authentifizierung erforderlich)
- `DELETE /:id/likes` - Like entfernen (Authentifizierung erforderlich)
- `GET /:id/comments` - Kommentare abrufen
- `PUT /:id/comments` - Kommentar hinzufügen (Authentifizierung erforderlich)
- `DELETE /:id/comments/:commentId` - Kommentar löschen (Authentifizierung erforderlich)

### Likes (/api/like)
- `GET /tree` - Alle geliketen Linktrees (Authentifizierung erforderlich)

### Kommentare (/api/comment)
- `GET /tree` - Alle kommentierten Linktrees (Authentifizierung erforderlich)

### Newsletter (/api/newsletter)
- `POST /` - Newsletter abonnieren
- `DELETE /:email` - Newsletter abbestellen
- `GET /` - Newsletter-Abos abrufen (Admin erforderlich)
- `PUT /` - Newsletter versenden (Admin erforderlich)

## Authentifizierung

Die API verwendet JWT Token für die Authentifizierung. Token können über folgende Methoden übergeben werden:

- `Authorization: Bearer <token>` Header
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
