# MASTER PROMPT — SEAIPC 2026 Open Journal System (OJS)

> Build a production-grade **Open Journal System** for academic conferences with end-to-end editorial workflow, full Content Management System (CMS), runtime theme switching, and multi-channel publication continuity. The system is currently used for **SEAIPC 2026** (9th Southeast Asia International Philanthropy Conference) but the CMS makes it reusable for any conference.

---

## 1. KONTEKS BISNIS

OJS untuk konferensi akademik. Workflow utama:

```
Author register → submit paper (PDF/DOCX)
       ↓
Editor menerima → assign reviewer (double-blind)
       ↓
Reviewer score + recommendation + komentar (rahasia editor)
       ↓
Editor putuskan: Accept / Reject / Revision Required / Publish
       ↓
[bila Revision] Author upload revisi → status=resubmitted → loop ke reviewer
       ↓
[bila Publish] Editor upload Final PDF (opsional) + DOI assignment
       ↓
Paper tampil di /journals (proceedings) publik dengan View/Download PDF
       ↓
Author memilih "Continue to Journal Publication" — pilih partner journal (URL+fee)
       ↓
Admin/Editor track journal request status di menu khusus
```

Roles: **author, reviewer, editor, admin** (admin = superuser).

---

## 2. TECH STACK (WAJIB)

### Backend
- **Python 3.11**, **FastAPI** (single file `server.py`)
- **MongoDB** via **motor** (async driver)
- **JWT** auth dengan **PyJWT** + **bcrypt** untuk password hashing
- **resend** SDK untuk email transactional
- **requests** untuk komunikasi ke Emergent Object Storage REST API
- Server jalan di `0.0.0.0:8001`, semua route prefix `/api/`
- Pakai **Pydantic v2** untuk semua input model
- DateTime: `datetime.now(timezone.utc).isoformat()` (string), bukan `utcnow()`
- ID semua dokumen: `str(uuid.uuid4())`. Field `id`, **bukan** `_id`. Selalu exclude `_id` dari MongoDB query: `{"_id": 0}`

### Frontend
- **React 19** + **React Router 7** + **Tailwind CSS** + **shadcn/ui** (komponen di `/src/components/ui/`)
- **axios** (instance custom di `/src/lib/api.js`, **TANPA** `withCredentials` — gunakan Bearer token saja)
- **sonner** untuk toast (`/src/components/ui/sonner.tsx`)
- **lucide-react** untuk icons (jangan emoji)
- **i18n** custom 2-bahasa (EN/ID) via React Context (`/src/i18n.jsx`)
- Build: `yarn` (jangan npm). Static output: `frontend/build/`
- Devserver di port 3000
- Token disimpan di `localStorage` key `ojs_token`, dipasang di `Authorization: Bearer <token>` header

### Environment Variables
**Backend `.env`:**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="seaipc2026"
JWT_SECRET="<64-hex-random>"
ADMIN_EMAIL="admin@..."
ADMIN_PASSWORD="<strong>"
EMERGENT_LLM_KEY="<for object storage>"
RESEND_API_KEY=""
SENDER_EMAIL="onboarding@resend.dev"
APP_NAME="seaipc2026"
FRONTEND_URL="https://yourdomain.com"
```

**Frontend `.env`:**
```env
REACT_APP_BACKEND_URL=https://yourdomain.com
WDS_SOCKET_PORT=443
```

---

## 3. DESIGN SYSTEM

### Aesthetic
**Swiss / Brutalist Editorial Light Theme** — jelas, presisi, hirarki tipografi kuat. Bukan playful, bukan generic SaaS dashboard.

### Typography
- Font primer: **IBM Plex Sans** (400/500/600/700) via Google Fonts
- Font mono: **IBM Plex Mono** untuk metadata (tanggal, ID, badge)
- Hero: `text-4xl sm:text-5xl lg:text-7xl` `font-bold` `tracking-tighter` `leading-[0.95]`
- H2: `text-3xl lg:text-4xl tracking-tight font-bold`
- Body: `text-base` (`text-sm` di mobile)
- **Overline** style: `text-[10px] uppercase tracking-[0.2em] text-gray-500` dengan prefix `—` (em-dash)

### Colors (CSS Variables — Runtime Switchable)
**Background fixed:** `--background: 220 14% 98%` (`#F9FAFB`), text `#111827`. **JANGAN gradient ungu/violet!**

**Accent dinamis** via CSS vars (di `:root` lalu di-override oleh JS):
```css
--brand: #002FA7;
--brand-hover: #1e3a8a;
--brand-soft: #e0e7ff;
--brand-on: #ffffff;
```

**8 palette wajib disediakan** (key: name, primary, hover, soft):
1. `blue-classic` — Classic Blue (IKB) `#002FA7` / `#1e3a8a` / `#e0e7ff`
2. `emerald` — `#047857` / `#065f46` / `#d1fae5`
3. `slate` — Slate Monochrome `#334155` / `#1e293b` / `#e2e8f0`
4. `royal-purple` — `#5b21b6` / `#4c1d95` / `#ede9fe`
5. `amber` — Amber Academic `#B45309` / `#92400e` / `#fef3c7`
6. `teal` — `#0F766E` / `#115e59` / `#ccfbf1`
7. `rose` — `#BE123C` / `#9f1239` / `#ffe4e6`
8. `indigo` — Indigo Scholar `#4338CA` / `#3730a3` / `#e0e7ff`

Apply via `applyPalette(key)` yang `setProperty('--brand', ...)` pada `document.documentElement`. Komponen pakai class Tailwind `bg-[var(--brand)]`, `text-[var(--brand)]`, `border-[var(--brand)]`, `hover:bg-[var(--brand-hover)]`.

**JANGAN sentuh `--accent` shadcn** (itu untuk hover gray bawaan komponen).

### Layout
- Max-width: `max-w-7xl` untuk halaman publik, `max-w-5xl` atau `max-w-6xl` untuk content-heavy
- Padding: `px-6 md:px-12 lg:px-24` dengan `py-16 lg:py-24`
- Border: `border-gray-300` (sharp `rounded-sm` 0.25rem, **bukan** rounded-xl)
- Card: `border border-gray-200 shadow-none p-6 bg-white`
- Hover micro-anim: `hover:-translate-y-0.5 transition-base`

### Komponen Khas
- **Status badge**: pill border-only dengan font-mono uppercase, warna sesuai status (`submitted`=gray, `under_review`=amber, `revision_required`=orange, `accepted`=emerald, `published`=emerald-filled, `rejected`=red)
- **Sidebar**: putih, border-l-2 indikator active item dengan `--brand-soft` background
- **Public header**: sticky, `bg-white/75 backdrop-blur-xl`, logo kiri + nav tengah + lang switcher EN/ID + login/register kanan
- **Footer dark**: `bg-gray-900 text-white` dengan accent `text-blue-300`

### data-testid WAJIB
Setiap interactive element & critical info HARUS punya `data-testid` kebab-case (`login-submit`, `paper-row-{id}`, `cms-tab-email`, dll). Tidak ada pengecualian.

---

## 4. AUTHENTICATION & AUTHORIZATION

### Endpoint Auth
| Method | Path | Body | Response | Auth |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{email, password (≥6), name, affiliation?, role?}` | `{id, email, name, role, affiliation, created_at, token}` | None |
| POST | `/api/auth/login` | `{email, password}` | sama seperti register | None |
| POST | `/api/auth/logout` | — | `{ok:true}` | Bearer |
| GET | `/api/auth/me` | — | user object | Bearer |
| POST | `/api/auth/forgot-password` | `{email}` | `{ok:true,message}` selalu 200 (anti enumerasi); log link 1-jam ke stderr | None |
| POST | `/api/auth/reset-password` | `{token, password}` | `{ok:true}` | None |

### Aturan
- Public register HANYA boleh role `author`. Role lain (`editor`/`admin`) dipaksa jadi `author` server-side. Promosi role hanya via admin.
- Token JWT 24 jam, payload `{sub:user_id, email, role, exp, type:"access"}`
- Password hash: `bcrypt.hashpw + checkpw`
- Reset token: `secrets.token_urlsafe(32)`, simpan di collection `password_reset_tokens` dengan `expires_at` (1 jam), `used:false`
- **TIDAK** pakai cookie. Frontend simpan token di `localStorage`, kirim via `Authorization: Bearer <token>`.

### Seeding Saat Startup
Selalu seed 4 demo accounts jika belum ada:
- `admin@ojs.com` / `admin123` (role: admin)
- `editor@ojs.com` / `editor123` (role: editor)
- `reviewer@ojs.com` / `reviewer123` (role: reviewer)
- `author@ojs.com` / `author123` (role: author)

Admin email/password ambil dari ENV (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### CORS
```python
allow_origins=["http://yourdomain.com", "https://yourdomain.com", "http://localhost:3000"]
allow_origin_regex=r"https://.*\.preview\.emergentagent\.com"
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

---

## 5. DATABASE SCHEMA (MongoDB Collections)

### `users`
```js
{
  id: "uuid", email: "...", password_hash: "bcrypt$",
  name: "...", affiliation: "...", role: "author|reviewer|editor|admin",
  created_at: "ISO8601 UTC"
}
// Index: email unique, id unique
```

### `papers`
```js
{
  id: "uuid", title, abstract, keywords: [str], co_authors: [str],
  author_id, author_name,
  status: "submitted|under_review|revision_required|resubmitted|accepted|rejected|published",
  file_id, file_name,                   // PDF/DOCX terakhir dari author
  final_file_id, final_file_name,       // PDF final saat publish (optional)
  reviewer_ids: [user_id],
  decision: "accept|reject|revision_required|publish" | null,
  decision_note, doi,
  created_at, updated_at
}
// Index: id unique, author_id
```

### `files`
```js
{
  id: "uuid", paper_id (nullable), storage_path, original_filename,
  content_type, size, uploaded_by, is_deleted: false,
  kind: "paper|final|flyer|logo",
  created_at
}
```

### `reviews`
```js
{
  id, paper_id, reviewer_id, reviewer_name,
  score: 1-10, recommendation: "accept|minor_revision|major_revision|reject",
  comments, confidential_notes,
  created_at, updated_at
}
// Compound unique index: (paper_id, reviewer_id)
```

### `notifications`
```js
{
  id, user_id, title, message, link, read: bool, created_at
}
// Index: user_id
```

### `password_reset_tokens`
```js
{ token: "urlsafe", user_id, email, expires_at, used: false, created_at }
// Index: token unique
```

### `site_content` (singleton — dokumen tunggal `id:"singleton"`)
Lihat **Section 8 (CMS)** untuk struktur lengkap.

### `journal_requests`
```js
{
  id, paper_id (UNIQUE — 1 request per paper), paper_title,
  author_id, author_name,
  journal_name, journal_url, journal_fee, note,
  status: "pending|submitted|accepted|rejected|completed",
  created_at, updated_at
}
// Index: id unique, paper_id unique
```

**WAJIB:** setiap kali return data dari MongoDB, exclude `_id`. Pakai `{"_id": 0}` di find. Setelah `insert_one`, **panggil `doc.pop("_id", None)`** sebelum return karena motor mutates dict in-place.

---

## 6. BACKEND ENDPOINTS LENGKAP

Semua prefix `/api/`. Dependency `get_current_user` (Bearer token) atau `require_roles("admin")`/`require_roles("editor")` (role admin selalu lolos role check).

### Users
- `GET /users?role=reviewer` — list (admin/editor)
- `PATCH /users/{id}/role` body `{role}` — admin only
- `DELETE /users/{id}` — admin only (block self-delete)

### Papers
- `POST /papers` body `{title, abstract, keywords[], co_authors[]}` — author, notifies all editors via in-app + email
- `GET /papers?status=` — role-scoped (author=own, reviewer=assigned, editor/admin=all)
- `GET /papers/published` — **public**, no auth
- `GET /papers/{id}` — RBAC (author own, reviewer assigned, editor/admin all)
- `POST /papers/{id}/upload` multipart `file` — author owns or editor/admin. PDF/DOCX max 25MB. Stores via Emergent Object Storage. If status=`revision_required`, auto-transition to `resubmitted`
- `POST /papers/{id}/upload-final` multipart `file` — editor/admin only. PDF only. Sets `final_file_id`
- `POST /papers/{id}/assign-reviewers` body `{reviewer_ids[]}` — editor only. Sets status=`under_review`, notifies all assignees
- `POST /papers/{id}/reviews` body `{score:1-10, recommendation, comments, confidential_notes}` — reviewer (assigned) or admin. Upsert by (paper_id, reviewer_id). Notifies editors
- `GET /papers/{id}/reviews` — role-scoped: reviewer sees own, author sees only after decision (& confidential_notes stripped + reviewer_name anonymized to "Reviewer"), editor sees all
- `POST /papers/{id}/decision` body `{decision, note, doi?, final_file_id?}` — editor only. On `publish`: auto-DOI `10.9999/seaipc2026.{first8}` if not provided; final_file_id fallback chain: body → existing → paper.file_id

### Files
- `GET /files/{id}/download` — RBAC, attachment
- `GET /files/{id}/preview?token=...` — RBAC, **inline** (untuk iframe PDF preview). Token via query string agar bisa di iframe.

### Public file endpoints (no auth)
- `GET /public/paper/{id}/pdf` — stream final PDF dari published paper
- `GET /public/logo/{id}` — inline image
- `GET /public/flyer/{id}` — inline image/PDF

### Journal Requests
- `POST /papers/{id}/journal-request` body `{journal_name, journal_url?, journal_fee?, note?}` — author only own paper, paper must be `published`. Upsert by paper_id.
- `GET /papers/{id}/journal-request` — author/editor/admin
- `GET /journal-requests` — editor/admin, sort by created_at desc, limit 500
- `PATCH /journal-requests/{id}` body `{status, note}` — editor/admin

### Notifications
- `GET /notifications` — own, last 50
- `POST /notifications/{id}/read` — own
- `POST /notifications/read-all` — own

### Stats
- `GET /stats` — role-specific dashboard counters

### Content / CMS (lihat Section 8)
- `GET /content` — public, dengan migrasi otomatis publications str→object, dan masking API key
- `PUT /content` — admin, partial update (preserve API key jika kosong)
- `POST /content/logo/upload` — admin, multipart, png/jpg/svg/webp ≤10MB
- `POST /content/flyer/upload` — admin, multipart, png/jpg/webp/pdf ≤10MB
- `POST /content/email/test` — admin, body `{to, resend_api_key?, sender_email?}`

---

## 7. FRONTEND PAGES

### Public (no auth)
| Path | Description |
|---|---|
| `/` | **Home** — Hero (overline + 2-line title + subtitle + CTAs Submit/CFP), 3-col stats, **Flyer section (di atas Important Dates, conditional)**, Important Dates strip 6-kolom, Process 4-step, Reviewer CTA dark section, Footer |
| `/about` | Hero abstract image, body, 2-col Objectives + Attendees, Venue list, Organiser dark card |
| `/call-for-papers` | Title + intro, **39 sub-themes grid 3-col** (numbered, hover invert ke brand), Publications dark section (name + URL + fee per item), CTA bar |
| `/dates` | Schedule list — 12-col grid per row dengan icon + tag + label + date right-aligned |
| `/templates` | 2-col card grid template (icon + name + language + description + Download button) |
| `/journals` | Hero gambar + overlay, archive grid 2-col paper cards dengan **View PDF + Download buttons** linked ke `/api/public/paper/{id}/pdf` |
| `/login` | Email + password + "Forgot password?" link + demo accounts box |
| `/register` | Name + email + affiliation + password (auto role=author) |
| `/forgot-password` | Email → reset link sent (success state) |
| `/reset-password?token=...` | New password input |

### Dashboard (auth required, layout = sidebar + main)
| Path | Roles | Description |
|---|---|---|
| `/dashboard` | all | Overview — role-specific stat cards + Quick Actions |
| `/dashboard/my-papers` | author | Table own papers |
| `/dashboard/submit` | author | Form: title + abstract + keywords (comma) + co_authors (comma) + file upload PDF/DOCX |
| `/dashboard/assigned` | reviewer | Table assigned papers |
| `/dashboard/submissions` | editor/admin | Table all submissions |
| `/dashboard/journal-requests` | editor/admin | Table journal requests, status dropdown CRUD |
| `/dashboard/users` | admin | Table users dengan role select + delete |
| `/dashboard/cms` | admin | **Site Content** — 8 tabs (lihat Section 8) |
| `/dashboard/notifications` | all | Inbox list, mark-as-read |
| `/dashboard/papers/{id}` | RBAC | Paper detail page |

### Paper Detail Page (`/dashboard/papers/{id}`) — KOMPLEKS
Layout vertikal:
1. **Back button** + status badge + paper id (font-mono first 8 chars)
2. **Title** (display 5xl) + author + co-authors line
3. **Timeline 4-step**: Submitted → Under Review → Decision → Published (bar progress, tanggal di tiap step)
4. **Metadata card**: overline "Abstract" + body, keyword chips, file row dengan **Preview** (PDF iframe modal) + **Download** buttons
5. **Action bar** (conditional by role + status):
   - Editor: **Assign Reviewers** dialog (checkbox list dari `GET /users?role=reviewer`)
   - Editor: **Make Decision** dialog (Select decision, Note textarea; bila `publish` → DOI input + **Final PDF (optional)** file input dengan auto-fallback explanation)
   - Reviewer (assigned): **Submit Review** dialog (score 1-10 number, recommendation Select, comments textarea, confidential_notes textarea)
   - Author + status=`revision_required`: file input + Upload Revision button
   - Author + status=`published`: **Continue to Journal Publication** button → dialog dengan radio list publications (name + URL link + fee), note textarea, Submit
6. **Decision card** (bila ada): decision name + DOI mono + note
7. **Journal Request card** (bila ada): brand-soft bg, journal name + URL link + fee + status, note
8. **Reviews list**: per review card dengan score + recommendation badge + comments. Confidential notes hanya editor/admin yang lihat.

---

## 8. CMS (Site Content) — DETAIL LENGKAP

Halaman `/dashboard/cms` (admin only). Implementasi **TabsList horizontal scrollable** dengan 8 tab. Setiap tab ada Save button dengan dirty indicator "Unsaved changes".

### Schema `site_content` (singleton)
```js
{
  id: "singleton",
  theme: "blue-classic" | one of 8 keys,
  branding: {
    conf_short, conf_full, conf_location, conf_date, conf_theme,
    hero_overline, hero_title, hero_title2, hero_subtitle,
    stat_edition, stat_tracks, stat_journals,
    logo_url, logo_file_id
  },
  flyer: {
    enabled: bool, image_url, image_file_id,
    title, caption, download_url
  },
  dates: [{ tag, label, date }],
  about: {
    title, body,
    objectives: [str], attendees: [str], venue_items: [str],
    organizer_body, contact_phone, contact_email
  },
  cfp: {
    title, intro,
    sub_themes: [str],
    publications: [{ name, url, fee }]   // backward compat: str → migrate to obj
  },
  templates: [{ name, language, filename, url }],
  email_settings: {
    resend_api_key (masked on read),
    sender_email, enabled
  }
}
```

### Tab 1: Theme
- Grid 4-col palette cards. Click selects + preview swatches. Save calls `PUT /content` body `{theme: key}`. ContentProvider calls `applyPalette(key)` post-save.

### Tab 2: Branding & Logo
- **Logo uploader**: 28x28 preview box + dashed click area + Remove. Upload → `POST /content/logo/upload` returns `{file_id, url:"/api/public/logo/{id}"}`.
- **Text fields** 2-col: conf_short, conf_full, conf_location, conf_date, conf_theme, hero_overline, hero_title, hero_title2, hero_subtitle (textarea full-row).
- **Stats** 3-col: edition, tracks, journals.

### Tab 3: Flyer
- Toggle "Show flyer section on Home" (`enabled`)
- Image uploader (40x56 preview, dashed click area, accepts PNG/JPG/WEBP/PDF)
- Title input + Caption textarea + External Download URL input

### Tab 4: Key Dates
- Repeater: per row 12-col grid (tag input col-span-2, label col-span-5, date col-span-4, delete col-span-1). Add Date button.

### Tab 5: About
- Title + Body (textarea 6 rows)
- 3 list editors: Objectives, Attendees, Venue Items. Each list item: textarea + delete button. Add button per list.
- Organiser body textarea, contact phone + email inputs

### Tab 6: Call for Papers
- Title + Intro textarea
- **Sub-themes**: numbered 2-col grid input rows + Add. Each row: 2-digit num + input + delete.
- **Publications**: per item card dengan 3 field (name textarea, url input, fee input) + delete

### Tab 7: Templates
- Repeater per template: name, language, filename, URL. Card layout.

### Tab 8: Email
- **How-to banner** biru: 5-step guide get Resend key (with link to resend.com/signup, resend.com/api-keys)
- Toggle Enable
- API key input (type=password, mask `re_a••••9f8c` jika sudah saved). Eye toggle show/hide. Clear button. Empty input on save = preserve existing key.
- Sender email input (default `onboarding@resend.dev`)
- **Send Test Email** section: recipient input + Send Test button (POST `/content/email/test`). Test menggunakan key yang baru diketik (jika ada) atau saved key.

### Important Implementation Notes
- **Backend `get_content()`** masking: NEVER return raw `resend_api_key`. Return `resend_api_key_set: bool` + `resend_api_key_preview: "re_aaaa••••zzzz"`.
- **Backend `update_content()`** preservation: jika `email_settings.resend_api_key` kosong/missing dalam request, ambil yang lama dari DB.
- **Backend `send_email()`**: cek `db.site_content.email_settings` dulu, fallback ke ENV. Jika `enabled=false` atau key kosong → log "[EMAIL MOCKED]" dan return mocked status (jangan throw).
- **Frontend ContentProvider** (`/src/lib/content.jsx`): fetch `GET /content` on mount, `applyPalette(theme)` immediately, expose `{content, loading, refresh, save}`.
- **Migration in get_content**: convert `cfp.publications: list[str]` → `list[{name,url:"",fee:""}]` dan persist back ke DB.

---

## 9. INTEGRATIONS

### Emergent Object Storage
REST API base `https://integrations.emergentagent.com/objstore/api/v1/storage`. Init dengan `EMERGENT_LLM_KEY` → dapat `storage_key`. PUT/GET object dengan header `X-Storage-Key`. Path convention: `{APP_NAME}/{kind}/{path}.{ext}`.

### Resend Email (transactional)
Pakai `resend` Python SDK. Set `resend.api_key` per-call (karena bisa berubah dari CMS). Sender harus dari domain yang verified di Resend account, atau pakai default `onboarding@resend.dev` (free tier, recipient harus sama dengan signup email Resend).

### Internationalization
Dua bahasa EN + ID. Translation dictionary di `/src/i18n.jsx`. Switcher di header & sidebar. **CMS content fields (about.body, dll) NOT bilingual** — admin pilih satu bahasa untuk content; UI labels yang switchable.

---

## 10. WORKFLOWS DETAIL

### Submission Flow
1. Author register → login → `/dashboard/submit`
2. Isi form: title (required), abstract (required, ≥50 chars suggested), keywords (comma-separated, optional), co_authors (comma-separated, optional), file upload (PDF/DOCX, max 25MB)
3. Submit → POST `/papers` create record → POST `/papers/{id}/upload` attach file
4. Status=`submitted`, all editors mendapat in-app notification + email

### Review Flow
1. Editor buka `/dashboard/submissions` → klik paper → "Assign Reviewers" → checkbox 1+ reviewer → Save
2. Status auto-transition ke `under_review`, semua reviewer dapat notification
3. Reviewer buka `/dashboard/assigned` → buka paper → "Submit Review" → score, recommendation (accept/minor/major/reject), comments (visible to author after decision), confidential_notes (editor only)
4. Reviews are upsert (resubmit overwrites)

### Decision Flow
1. Editor buka paper → "Make Decision" dialog
2. Select decision: Accept / Reject / Revision Required / Publish
3. Note to author (textarea)
4. Bila Publish: optional DOI input, optional Final PDF upload (else uses author's last)
5. Submit → status update + notification to author + email

### Revision Flow (post `revision_required`)
1. Author melihat paper dengan status `revision_required`
2. Reviews + decision_note tampil
3. File chooser + Upload Revision button
4. POST `/papers/{id}/upload` → status auto ke `resubmitted`
5. Editor + reviewer dinotify

### Publication Flow
1. Editor publish → status=`published`, DOI assigned, final_file_id resolved
2. Paper langsung muncul di `/journals` publik dengan View/Download PDF
3. Author buka paper detail → "Continue to Journal Publication" button
4. Dialog: pilih partner journal (radio dengan name + URL + fee), note (optional)
5. Submit → record di `journal_requests`, all editors notified
6. Admin/editor buka `/dashboard/journal-requests` → status dropdown (pending → submitted → accepted/rejected → completed)

---

## 11. CRITICAL RULES (TIDAK BOLEH DILANGGAR)

1. **Tidak ada hardcoded URLs/secrets**. Semua dari ENV.
2. **API routes WAJIB prefix `/api/`** (Kubernetes ingress requirement).
3. **MongoDB**: exclude `_id` di find, pop `_id` setelah insert.
4. **DateTime**: ISO string UTC, bukan datetime native (untuk JSON safety).
5. **CORS**: `allow_origins=["*"]` + `allow_credentials=True` adalah BUG. Pakai explicit origins + regex untuk preview.
6. **Frontend axios**: TANPA `withCredentials` (Emergent ingress override CORS jadi `*`, incompatible dengan credentials).
7. **Status transitions**: ikuti chart flow, jangan loncat (mis. `submitted` tidak boleh langsung ke `accepted` tanpa `under_review`).
8. **Public registration**: paksa role=author server-side, jangan trust client.
9. **Reviewer authz**: reviewer hanya lihat reviews sendiri; author hanya lihat reviews setelah decision (confidential stripped).
10. **Email API key**: never return raw, always mask in GET. PUT preserve jika kosong.
11. **File upload size**: ≤25MB papers, ≤10MB images/flyer/logo. Validate ext.
12. **data-testid** pada SETIAP interactive element.
13. **`bg-[var(--brand)]` untuk primary**, **JANGAN hardcode `#002FA7`** lagi setelah CSS vars setup.
14. **Tidak ada gradient purple/violet pada white background** (anti AI-slop).

---

## 12. DEPLOYMENT (untuk konteks)

Target: VPS Ubuntu 22.04 dengan Nginx reverse proxy + Let's Encrypt SSL + PM2 process manager + MongoDB self-hosted.

```
Browser → Nginx :443 (SSL)
        ├─ /        → static React build
        └─ /api/    → proxy_pass http://127.0.0.1:8001 (FastAPI via PM2)

MongoDB :27017 (localhost only, never expose public)
File storage: Emergent Object Storage (cloud) via EMERGENT_LLM_KEY
```

GitHub Actions workflow untuk auto-deploy on push to main:
1. SSH ke VPS
2. `git pull`
3. Backend: `pip install -r requirements.txt && pm2 restart`
4. Frontend: `yarn install && yarn build`

---

## 13. DEMO DATA SEED

Saat first startup (jika collection kosong):
- 4 demo users (admin, editor, reviewer, author) dengan password lemah
- Default `site_content` document dengan SEAIPC 2026 content (39 sub-themes, 4 publications, 6 dates, 2 templates)

File `test_credentials.md` di `/app/memory/` untuk testing agent.

---

## 14. TESTING

### Backend
Pytest suite di `/app/backend/tests/` (test_ojs_api.py, test_seaipc_features.py, test_cms.py, test_seaipc_v2_features.py). Total ≥107 tests menutupi:
- Auth (register, login, logout, me, forgot/reset)
- Papers CRUD + upload + RBAC
- Reviews flow
- Decisions + DOI + final PDF
- Notifications
- Stats per role
- Content CRUD + masking + migration
- Journal requests CRUD + RBAC
- Public endpoints (papers/published, public/paper PDF, public/logo, public/flyer)

### Frontend
Smoke test via Playwright:
- Login flows (4 roles)
- Submit paper → upload → editor assign → reviewer review → editor publish → author journal request
- CMS edit theme → see change live
- Public pages render content from API

---

## OUTPUT TARGET

Aplikasi production-ready dengan:
- Frontend bundled (yarn build), <1.5MB gzipped
- Backend response time <200ms p95
- Single MongoDB instance, no replication needed initially
- Logo, flyer, PDF di Emergent Object Storage (cloud)
- SSL HTTPS, semua route `/api` rate-limit-able via Nginx
- Content fully editable via admin CMS, NO redeploy needed for copy changes
- Theme switchable runtime, NO refresh needed
- Bilingual EN/ID toggle untuk UI labels
- Email transactional via Resend (admin set key dari CMS, tidak perlu touch .env)

---

# AKHIR PROMPT

> Build setiap bagian di atas. Jangan skip data-testid. Jangan hardcode warna. Jangan abaikan MongoDB ObjectId pitfall. Jangan pakai `withCredentials` dengan Emergent ingress. Jangan campur shadcn `--accent` dengan brand `--brand`. Test dengan testing agent setelah setiap iterasi besar.
