# Frontend Internship Assignment - Task Scheduler

A frontend-only task management application built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Live Project

- Deployed URL: `https://taskscheduler-one.vercel.app`
- GitHub Repository: `https://github.com/shashank-tomar-2004/todo-task`

## Demo Login

This assignment uses a static login flow (as required for a frontend-only setup).

- Email: `intern@demo.com`
- Password: `intern123`

## Assignment Compliance

- No backend/database server used
- Data is persisted locally in browser storage (`localStorage`)
- Auth is simulated via local-only logic and route protection middleware

## Key Features

- Static login with validation and logout
- Protected routes (`/board/...`) using middleware
- Sidebar navigation with dedicated sections:
  - Home
  - My Tasks
  - Inbox
  - Portfolios
  - Goals
- Top workspace tabs:
  - Overview
  - List
  - Board
  - Calendar
  - Documents
  - Messages
- Project portals:
  - Tasks are grouped by project
  - Dedicated project board and project calendar views
- Task management:
  - Create, edit, delete tasks
  - Drag and drop between `Todo`, `Doing`, `Done`
  - Search, filter, and sort
  - Tags, due date, priority, project mapping
- Calendar view:
  - Monthly calendar with task counts
  - Day-level task detail panel
- Documents module (frontend-only):
  - Upload, list, download, delete (local state)
- Messages module (frontend-only):
  - Send/receive simulation in local state
- Activity tracking:
  - Activity feed inside Messages section
  - Clear all or clear per activity item
- Invite/Share/Settings modals with local-only behavior
- Theme toggle with animation
- Responsive overflow handling:
  - Scrollable task columns and panels
  - Scroll-safe create-task form area
  - Modal max-height scrolling for smaller screens

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Vitest

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run test
npm run lint
```

## Verification Status

Executed locally:

- `npm run build` -> pass
- `npm run test` -> pass (3 tests)

## Important Paths

- `src/app/login/page.tsx` - Login page
- `src/app/board/[[...slug]]/page.tsx` - Main workspace + section/tab/project routing UI
- `src/middleware.ts` - Auth/route guard
- `src/lib/storage.ts` - Local persistence helpers
- `src/lib/task-utils.ts` - Search/filter/sort/board helpers
- `src/lib/task-utils.test.ts` - Unit tests

## Notes for Reviewers

- This project intentionally avoids backend/database services to match the internship assignment constraints.
- Features like Invite, Share, Messages, and Documents are implemented as frontend workflows with local persistence.
