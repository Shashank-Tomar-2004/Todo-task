# Frontend Internship Assignment - Task Board

A Task Board web app built with Next.js (App Router) that fulfills the given assignment requirements.

## Features

- Static login flow with hardcoded credentials
  - Email: `intern@demo.com`
  - Password: `intern123`
- Invalid login error handling
- Remember me using localStorage + auth cookie
- Logout functionality
- Protected board route (`/board`) via Next middleware
- Fixed task columns: `Todo`, `Doing`, `Done`
- Task fields: title, description, priority, due date, tags, createdAt
- Create, edit, delete tasks
- Drag and drop across columns
- Search by title
- Filter by priority
- Sort by due date (empty due dates always last)
- Activity log for create/edit/move/delete actions
- Persistent board state with safe storage handling
- Reset board with confirmation
- Basic unit tests (3)

## Tech

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4 (utility classes)
- Vitest for unit tests

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Test

```bash
npm run test
```

## Build

```bash
npm run build
npm run start
```

## Project Structure

- `src/app/login/page.tsx`: login screen and static credential validation
- `src/app/board/page.tsx`: main task board UI and state/actions
- `src/middleware.ts`: route protection logic
- `src/lib/storage.ts`: persistence and safe localStorage parsing
- `src/lib/task-utils.ts`: search/filter/sort/move helpers
- `src/lib/task-utils.test.ts`: unit tests

## Assignment Submission Notes

For submission include:
- Deployed application URL
- ZIP of source code
- This README
