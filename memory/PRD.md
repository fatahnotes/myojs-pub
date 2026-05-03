# OJS - SEAIPC 2026 (Open Journal System)

## Original Problem Statement
"Buatkan saya sistem untuk OJS open journal system dimana user bisa registrasi, login, submit paper lalu proses review paper sampai finalisasi paper."

## Deployment Target
- Production: http://seaipc2026.imz.or.id/ (guide in /app/memory/deployment_guide.md — conversation transcript)

## Architecture
- FastAPI + MongoDB (motor), JWT (PyJWT), bcrypt, Emergent Object Storage, Resend SDK
- React 19 + React Router 7 + Tailwind + shadcn/ui + sonner + axios + i18n EN/ID
- Runtime theme switching via CSS variables (`--brand`, `--brand-hover`, `--brand-soft`, `--brand-on`)

## What's Been Implemented

### Iteration 1 — Core OJS
Auth, paper CRUD + upload, review flow, decision flow, revision, notifications, stats, admin users, i18n.

### Iteration 2 — SEAIPC rebrand
Call for Papers, Key Dates, Templates, About, password reset, PDF inline preview, DOI on publish.

### Iteration 3 — CMS & Theming
Admin CMS at `/dashboard/cms` with 8 tabs: Theme (8 palettes), Branding & Logo, Flyer (above Key Dates), Key Dates, About, Call for Papers, Templates, **Email** (Resend key + sender + test button).

### Iteration 4 — Final PDF & Journal Publication Requests
- **Final PDF on publish**: editor decision dialog has optional Final PDF upload; if omitted, falls back to author's latest upload. Public endpoint `GET /api/public/paper/{id}/pdf` serves the PDF for published papers.
- **Proceedings page**: each published paper shows `View PDF` + `Download` buttons (linked to public endpoint).
- **Journal publication request**: after paper published, author picks a partner journal (name/url/fee from CMS) and submits a request. Admin/editor sees new **Journal Requests** sidebar menu with list + status CRUD (pending/submitted/accepted/rejected/completed).
- **Publications migration**: CMS → Call for Papers → Publications changed from list[str] to list[{name, url, fee}] with backward-compat auto-migration on read.
- **Bug fix**: ObjectId serialization on `POST /papers/{id}/journal-request` (doc.pop('_id') after insert).

## Test Results
- Iteration 1: 34/34 (100%)
- Iteration 2: 45/46 + 12/12 new
- Iteration 3: 63/63 (100%)
- Iteration 4: **22/22 new + 85/85 regression (100%)**, 1 critical bug found & fixed by testing agent

## Backlog / Next Phase
### P1
- Set `RESEND_API_KEY` via CMS → Email tab to enable real emails
- Deploy to `seaipc2026.imz.or.id` (full guide already provided)
- Cache-Control on `/api/public/paper/{id}/pdf`, `/api/public/logo/{id}`, `/api/public/flyer/{id}`
- Validate `DecisionIn.final_file_id` belongs to same paper
- Pydantic validation on `PATCH /journal-requests/{id}` status field (enum)

### P2
- Pagination on `/api/journal-requests` (currently capped at 500)
- Max length on `JournalRequestIn.journal_name/note`
- Multiple journal request history per paper (drop unique index)
- Split server.py (~1100 lines) into routers (auth/papers/reviews/content/journal_requests)
- Split CMS.jsx into per-tab files under src/pages/cms/
- DialogDescription / aria-describedby on all shadcn Dialogs

### P3
- ORCID / Crossref DOI integration
- Real domain verification flow for Resend sender
- Analytics per-journal (which partner journals get most requests)
- Public author profile pages

## Demo Credentials
- Admin: admin@ojs.com / admin123
- Editor: editor@ojs.com / editor123
- Reviewer: reviewer@ojs.com / reviewer123
- Author: author@ojs.com / author123
