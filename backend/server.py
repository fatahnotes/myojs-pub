from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import asyncio
import bcrypt
import jwt
import requests
import resend
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Depends, Query, Header
from fastapi.responses import StreamingResponse, Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
import secrets
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from bson import ObjectId
from io import BytesIO

# ==================== ENV & DB ====================
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_NAME = os.environ.get('APP_NAME', 'ojs-app')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
storage_key = None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="OJS API")
api_router = APIRouter(prefix="/api")

# ==================== STORAGE ====================
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ==================== AUTH HELPERS ====================
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def create_access_token(uid: str, email: str, role: str) -> str:
    payload = {"sub": uid, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return checker

# ==================== EMAIL ====================
async def send_email(to: str, subject: str, html: str):
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL MOCKED - no RESEND_API_KEY] To: {to} | Subject: {subject}")
        return {"status": "mocked"}
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "id": result.get("id")}
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"status": "error", "error": str(e)}

async def notify(user_id: str, title: str, message: str, link: Optional[str] = None, send_email_flag: bool = False):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif)
    if send_email_flag:
        u = await db.users.find_one({"id": user_id}, {"_id": 0})
        if u and u.get("email"):
            html = f"<div style='font-family:sans-serif;padding:20px'><h2>{title}</h2><p>{message}</p><p>Open OJS: <a href='{FRONTEND_URL}'>{FRONTEND_URL}</a></p></div>"
            await send_email(u["email"], title, html)

# ==================== MODELS ====================
Role = Literal["author", "reviewer", "editor", "admin"]
PaperStatus = Literal["submitted", "under_review", "revision_required", "resubmitted", "accepted", "rejected", "published"]

class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    affiliation: Optional[str] = ""
    role: Optional[Role] = "author"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    affiliation: Optional[str] = ""
    created_at: str

class PaperIn(BaseModel):
    title: str
    abstract: str
    keywords: List[str] = []
    co_authors: List[str] = []

class PaperOut(BaseModel):
    id: str
    title: str
    abstract: str
    keywords: List[str]
    co_authors: List[str]
    author_id: str
    author_name: str
    status: str
    file_id: Optional[str] = None
    file_name: Optional[str] = None
    reviewer_ids: List[str] = []
    decision: Optional[str] = None
    decision_note: Optional[str] = None
    created_at: str
    updated_at: str

class AssignReviewersIn(BaseModel):
    reviewer_ids: List[str]

class ReviewIn(BaseModel):
    score: int = Field(ge=1, le=10)
    recommendation: Literal["accept", "minor_revision", "major_revision", "reject"]
    comments: str
    confidential_notes: Optional[str] = ""

class DecisionIn(BaseModel):
    decision: Literal["accept", "reject", "revision_required", "publish"]
    note: str = ""
    doi: Optional[str] = None
    final_file_id: Optional[str] = None

class JournalRequestIn(BaseModel):
    journal_name: str
    journal_url: Optional[str] = ""
    journal_fee: Optional[str] = ""
    note: Optional[str] = ""

class ForgotIn(BaseModel):
    email: EmailStr

class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)

class UpdateUserRoleIn(BaseModel):
    role: Role

# ==================== CONTENT / CMS ====================
DEFAULT_CONTENT = {
    "id": "singleton",
    "theme": "blue-classic",
    "branding": {
        "conf_short": "SEAIPC 2026",
        "conf_full": "9th Southeast Asia International Philanthropy Conference 2026",
        "conf_location": "Jakarta / Bogor, Indonesia",
        "conf_date": "26 – 27 August 2026",
        "conf_theme": "Waqf for the Future: Building Lasting Impact and Economic Resilience in Southeast Asia",
        "hero_overline": "— Vol. 09 · Jakarta / Bogor · 26–27 Aug 2026",
        "hero_title": "Waqf for the Future.",
        "hero_title2": "Building Lasting Impact and Economic Resilience in Southeast Asia.",
        "hero_subtitle": "The 9th Southeast Asia International Philanthropy Conference brings together academicians, researchers, industry, government, and the public to a forum on Islamic microfinance, philanthropy, and the mainstream economy.",
        "stat_edition": "9th",
        "stat_tracks": "39",
        "stat_journals": "4",
        "logo_url": "",
        "logo_file_id": "",
    },
    "flyer": {
        "enabled": False,
        "image_url": "",
        "image_file_id": "",
        "title": "Official Conference Flyer",
        "caption": "Download the full SEAIPC 2026 programme and venue details.",
        "download_url": "",
    },
    "dates": [
        {"tag": "Submission", "label": "Abstract Submission", "date": "15 May 2026"},
        {"tag": "Submission", "label": "Full Paper Submission", "date": "11 July 2026"},
        {"tag": "Payment", "label": "Early Bird Payment", "date": "10 June 2026"},
        {"tag": "Final", "label": "Final Manuscript & Payment", "date": "19 July 2026"},
        {"tag": "Event", "label": "Conference Dates", "date": "26 – 27 August 2026"},
        {"tag": "Event", "label": "City & Empowerment Visit", "date": "28 August 2026"},
    ],
    "about": {
        "title": "About SEAIPC 2026",
        "body": "The Southeast Asia International Philanthropy Conference (SEAIPC) is an annual conference which brings together academicians, researchers, industry experts, government, and concerned public to a forum on issues pertaining Islamic microfinance and philanthropy. Previous SEAIPCs were held in Jakarta, Bandung, Melaka, Jogjakarta, Bangkok, and Sarawak. This year, SEAIPC will be held in Jakarta / Bogor, Indonesia.",
        "objectives": [
            "Bring stakeholders involved in philanthropy to discuss, exchange ideas, and share experiences.",
            "Present findings on business and management perspectives of philanthropy.",
            "Incorporate sustainability in philanthropy activities.",
            "Explore new opportunities in philanthropy globally.",
            "Provide a platform for philanthropy-related organisations to exhibit products, innovations, and services.",
        ],
        "attendees": [
            "Government GLCs & Private Companies",
            "Researchers",
            "NGOs",
            "Academicians",
            "Graduate Students",
        ],
        "venue_items": [
            "Jakarta: Ashley Hotel or Millennium Hotel",
            "Bogor: IPB Convention Center Hotel",
            "City Tour: Tanah Abang, Thamrin City, and Bogor",
            "Philanthropy Visit: Zona Madina Dompet Dhuafa, Bogor",
        ],
        "organizer_body": "In collaboration with IMZ Capital · Eight Duren Tiga Selatan No. 8, Jakarta Selatan, Indonesia",
        "contact_phone": "+62 852 1564 6958",
        "contact_email": "training@imz.or.id",
    },
    "cfp": {
        "title": "Call for Papers",
        "intro": "We welcome original contributions across the following sub-themes. All accepted abstracts will be published in the conference proceedings with an e-ISBN. Selected full papers will be considered for publication in partner journals.",
        "sub_themes": [
            "Mainstream Philanthropy", "Business and Management", "Societal Well-Being", "Zakat",
            "Islamic Economics", "Entrepreneurship", "Global Business", "Social Welfare",
            "Madani Concept", "Waqf", "Islamic Corporate Governance", "Economics",
            "Operation Management", "Well-being", "Sustainable Development Goals (SDGs)",
            "Islamic Finance", "Tourism", "Philanthropy Employment / Labor Services",
            "Supply Chain", "Environment and Sustainability", "Ar-Rahnu",
            "Islamic Management of Philanthropy", "Health Philanthropy", "Insurance and Takaful",
            "Halal Supply Chain", "Education", "Early Childhood Education",
            "Fundraising and Crowdfunding", "Halal Industry / Halal Ecosystem",
            "Industrial Revolution", "Financial Management", "Wills and Faraid",
            "Ageing Population and Well-being", "Business Ethics", "Financial Accounting",
            "Marketing", "Investment", "Digital Business and Entrepreneurship", "Sukuk",
        ],
        "publications": [
            {"name": "Al-Iqtishad: Jurnal Ilmu Ekonomi Syariah, UIN Syarif Hidayatullah Jakarta (Sinta 2)", "url": "", "fee": ""},
            {"name": "Ahkam: Jurnal Ilmu Syariah, UIN Syarif Hidayatullah Jakarta (Q1 Scopus)", "url": "", "fee": ""},
            {"name": "Journal of Islamic Philanthropy & Social Finance (CIPSF, UiTM Malaysia)", "url": "", "fee": ""},
            {"name": "E-Journal of Islamic Thought & Understanding (E-JITU), Mycite index", "url": "", "fee": ""},
        ],
    },
    "templates": [
        {
            "name": "E-JITU Template (English)",
            "language": "English",
            "filename": "E-JITU_Template_ENGLISH.docx",
            "url": "https://customer-assets.emergentagent.com/job_paper-review-flow/artifacts/us8z6fop_E-JITU%20Template%20%28ENGLISH%29%20%E2%80%93%20Download%20This.docx",
        },
        {
            "name": "E-JITU Template (Bahasa Melayu)",
            "language": "Bahasa Melayu",
            "filename": "E-JITU_Template_BAHASA_MELAYU.docx",
            "url": "https://customer-assets.emergentagent.com/job_paper-review-flow/artifacts/ezczxwag_E-JITU%20Template%20%28BAHASA%20MELAYU%29%20%E2%80%93%20Download%20This.docx",
        },
    ],
    "email_settings": {
        "resend_api_key": "",
        "sender_email": "onboarding@resend.dev",
        "enabled": False,
    },
}

class ContentIn(BaseModel):
    theme: Optional[str] = None
    branding: Optional[dict] = None
    flyer: Optional[dict] = None
    dates: Optional[List[dict]] = None
    about: Optional[dict] = None
    cfp: Optional[dict] = None
    templates: Optional[List[dict]] = None
    email_settings: Optional[dict] = None

class EmailTestIn(BaseModel):
    to: EmailStr
    resend_api_key: Optional[str] = None
    sender_email: Optional[str] = None

@api_router.get("/content")
async def get_content():
    c = await db.site_content.find_one({"id": "singleton"}, {"_id": 0})
    if not c:
        await db.site_content.insert_one({**DEFAULT_CONTENT})
        c = {**DEFAULT_CONTENT}
    # Ensure all top-level keys exist
    merged = {**DEFAULT_CONTENT, **{k: v for k, v in c.items() if v is not None}}
    # Backward compat: migrate publications from list[str] -> list[dict]
    try:
        cfp = merged.get("cfp") or {}
        pubs = cfp.get("publications") or []
        migrated = []
        changed = False
        for p in pubs:
            if isinstance(p, str):
                migrated.append({"name": p, "url": "", "fee": ""})
                changed = True
            elif isinstance(p, dict):
                migrated.append({"name": p.get("name", ""), "url": p.get("url", ""), "fee": p.get("fee", "")})
            else:
                migrated.append({"name": str(p), "url": "", "fee": ""})
                changed = True
        cfp["publications"] = migrated
        merged["cfp"] = cfp
        if changed:
            await db.site_content.update_one({"id": "singleton"}, {"$set": {"cfp.publications": migrated}})
    except Exception:
        pass
    # Mask the Resend API key — never expose raw secret
    es = dict(merged.get("email_settings") or {})
    raw_key = es.get("resend_api_key") or ""
    es["resend_api_key_set"] = bool(raw_key)
    es["resend_api_key_preview"] = (raw_key[:4] + "••••" + raw_key[-4:]) if len(raw_key) >= 10 else ""
    es.pop("resend_api_key", None)
    merged["email_settings"] = es
    return merged

@api_router.put("/content")
async def update_content(body: ContentIn, user: dict = Depends(require_roles("admin"))):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    # Special handling for email_settings: preserve existing key if caller didn't send one (empty string)
    if "email_settings" in updates:
        new_es = dict(updates["email_settings"] or {})
        existing = await db.site_content.find_one({"id": "singleton"}, {"_id": 0, "email_settings": 1}) or {}
        existing_es = existing.get("email_settings") or {}
        if "resend_api_key" not in new_es or new_es.get("resend_api_key") in (None, ""):
            # Keep existing key if user didn't provide a new one
            new_es["resend_api_key"] = existing_es.get("resend_api_key", "")
        updates["email_settings"] = {
            "resend_api_key": new_es.get("resend_api_key", ""),
            "sender_email": new_es.get("sender_email") or existing_es.get("sender_email") or "onboarding@resend.dev",
            "enabled": bool(new_es.get("enabled", existing_es.get("enabled", True))),
        }
    await db.site_content.update_one(
        {"id": "singleton"},
        {"$set": updates, "$setOnInsert": {"id": "singleton"}},
        upsert=True,
    )
    return await get_content()

@api_router.post("/content/email/test")
async def email_test(body: EmailTestIn, user: dict = Depends(require_roles("admin"))):
    """Send a test email using either the provided key or the saved key."""
    key = body.resend_api_key
    sender = body.sender_email or SENDER_EMAIL
    if not key:
        # Use saved key
        doc = await db.site_content.find_one({"id": "singleton"}, {"_id": 0, "email_settings": 1})
        key = (doc or {}).get("email_settings", {}).get("resend_api_key", "")
        sender = sender or (doc or {}).get("email_settings", {}).get("sender_email", SENDER_EMAIL)
    if not key:
        raise HTTPException(status_code=400, detail="No Resend API key configured. Save it first or provide one in this request.")
    html = f"""<div style='font-family:sans-serif;padding:24px;max-width:520px;margin:auto;background:#fff;border:1px solid #e5e7eb'>
        <div style='color:#6b7280;font-size:11px;letter-spacing:.2em;text-transform:uppercase'>— Test Email</div>
        <h2 style='margin:12px 0 8px;font-size:24px'>SEAIPC 2026 — Email configured ✓</h2>
        <p style='color:#374151;font-size:14px;line-height:1.6'>
            This is a test message from your OJS. If you received this, your Resend API key and sender address are working correctly.
        </p>
        <p style='color:#9ca3af;font-size:12px;margin-top:24px;font-family:monospace'>
            Sender: {sender}<br/>
            Sent at: {datetime.now(timezone.utc).isoformat()}
        </p>
    </div>"""
    try:
        resend.api_key = key
        params = {"from": sender, "to": [body.to], "subject": "SEAIPC 2026 — Test email", "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "sent", "id": result.get("id"), "to": body.to, "from": sender}
    except Exception as e:
        logger.error(f"Test email failed: {e}")
        raise HTTPException(status_code=500, detail=f"Send failed: {str(e)}")

@api_router.post("/content/flyer/upload")
async def upload_flyer(file: UploadFile = File(...), user: dict = Depends(require_roles("admin"))):
    return await _upload_content_image(file, user, kind="flyer", allowed=("jpg","jpeg","png","webp","pdf"))

@api_router.post("/content/logo/upload")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(require_roles("admin"))):
    return await _upload_content_image(file, user, kind="logo", allowed=("jpg","jpeg","png","webp","svg"))

async def _upload_content_image(file: UploadFile, user: dict, kind: str, allowed: tuple):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed: {', '.join(allowed)}")
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/{kind}s/{file_id}.{ext}"
    mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                "webp": "image/webp", "pdf": "application/pdf", "svg": "image/svg+xml"}
    content_type = mime_map.get(ext, "application/octet-stream")
    result = put_object(path, data, content_type)
    await db.files.insert_one({
        "id": file_id,
        "paper_id": None,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "is_deleted": False,
        "kind": kind,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    public_url = f"/api/public/{kind}/{file_id}"
    return {"file_id": file_id, "url": public_url, "filename": file.filename}

@api_router.get("/public/flyer/{file_id}")
async def public_flyer(file_id: str):
    return await _public_content_file(file_id, "flyer")

@api_router.get("/public/logo/{file_id}")
async def public_logo(file_id: str):
    return await _public_content_file(file_id, "logo")

async def _public_content_file(file_id: str, kind: str):
    f = await db.files.find_one({"id": file_id, "is_deleted": False, "kind": kind}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail=f"{kind} not found")
    data, ct = get_object(f["storage_path"])
    return FastResponse(content=data, media_type=f.get("content_type", ct),
                        headers={"Content-Disposition": f'inline; filename="{f["original_filename"]}"'})

# ==================== AUTH ROUTES ====================
@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    role = body.role or "author"
    # Don't allow self-registering as admin/editor through public register
    if role in ("admin", "editor"):
        role = "author"
    user = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "affiliation": body.affiliation or "",
        "role": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_access_token(uid, email, role)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    return {"id": uid, "email": email, "name": body.name, "role": role,
            "affiliation": user["affiliation"], "created_at": user["created_at"], "token": token}

@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(u["id"], u["email"], u["role"])
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    return {"id": u["id"], "email": u["email"], "name": u["name"], "role": u["role"],
            "affiliation": u.get("affiliation", ""), "created_at": u["created_at"], "token": token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn):
    email = body.email.lower()
    u = await db.users.find_one({"email": email})
    # Always respond 200 (no enumeration)
    if u:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": u["id"],
            "email": email,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        logger.info(f"[PASSWORD RESET] link for {email}: {reset_link}")
        html = f"""<div style='font-family:sans-serif;padding:20px'>
            <h2>SEAIPC 2026 — Password Reset</h2>
            <p>Click the link below to reset your password (valid 1 hour):</p>
            <p><a href='{reset_link}'>{reset_link}</a></p>
            <p>If you did not request this, ignore this email.</p></div>"""
        await send_email(email, "SEAIPC 2026 — Reset your password", html)
    return {"ok": True, "message": "If the email exists, a reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": body.token, "used": False}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}

# ==================== USERS ====================
@api_router.get("/users")
async def list_users(role: Optional[str] = None, user: dict = Depends(get_current_user)):
    # Editors and admins can list users (esp. reviewers)
    if user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Forbidden")
    q = {}
    if role:
        q["role"] = role
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, body: UpdateUserRoleIn, user: dict = Depends(require_roles("admin"))):
    res = await db.users.update_one({"id": user_id}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete self")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

# ==================== PAPERS ====================
async def _serialize_paper(p: dict) -> dict:
    p.pop("_id", None)
    return p

@api_router.post("/papers")
async def create_paper(body: PaperIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("author", "admin", "editor", "reviewer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    pid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    paper = {
        "id": pid,
        "title": body.title,
        "abstract": body.abstract,
        "keywords": body.keywords,
        "co_authors": body.co_authors,
        "author_id": user["id"],
        "author_name": user["name"],
        "status": "submitted",
        "file_id": None,
        "file_name": None,
        "final_file_id": None,
        "final_file_name": None,
        "reviewer_ids": [],
        "decision": None,
        "decision_note": None,
        "doi": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.papers.insert_one(paper)
    # Notify all editors
    editors = await db.users.find({"role": {"$in": ["editor", "admin"]}}, {"_id": 0, "id": 1}).to_list(100)
    for e in editors:
        await notify(e["id"], "New Paper Submission", f"'{body.title}' has been submitted.", f"/dashboard/papers/{pid}", send_email_flag=True)
    await notify(user["id"], "Submission Received", f"Your paper '{body.title}' was submitted.", f"/dashboard/papers/{pid}", send_email_flag=True)
    return await _serialize_paper(paper)

@api_router.get("/papers")
async def list_papers(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    role = user["role"]
    if role == "author":
        q["author_id"] = user["id"]
    elif role == "reviewer":
        q["reviewer_ids"] = user["id"]
    # editor/admin: see all
    if status:
        q["status"] = status
    papers = await db.papers.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return papers

@api_router.get("/papers/published")
async def list_published():
    # Public endpoint
    papers = await db.papers.find({"status": "published"}, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return papers

@api_router.get("/papers/{paper_id}")
async def get_paper(paper_id: str, user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    role = user["role"]
    if role == "author" and p["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    if role == "reviewer" and user["id"] not in p.get("reviewer_ids", []):
        raise HTTPException(status_code=403, detail="Forbidden")
    return p

@api_router.post("/papers/{paper_id}/upload")
async def upload_paper_file(paper_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    if p["author_id"] != user["id"] and user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Forbidden")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ("pdf", "docx", "doc"):
        raise HTTPException(status_code=400, detail="Only PDF/DOCX files allowed")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/papers/{p['author_id']}/{file_id}.{ext}"
    content_type = file.content_type or ("application/pdf" if ext == "pdf" else "application/octet-stream")
    result = put_object(path, data, content_type)
    file_doc = {
        "id": file_id,
        "paper_id": paper_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.files.insert_one(file_doc)
    new_status = p["status"]
    if p["status"] == "revision_required":
        new_status = "resubmitted"
    await db.papers.update_one({"id": paper_id}, {"$set": {
        "file_id": file_id, "file_name": file.filename, "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"file_id": file_id, "filename": file.filename, "status": new_status}

@api_router.get("/files/{file_id}/download")
async def download_file(file_id: str, user: dict = Depends(get_current_user)):
    f = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    p = await db.papers.find_one({"id": f["paper_id"]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    role = user["role"]
    allowed = role in ("admin", "editor") or p["author_id"] == user["id"] or user["id"] in p.get("reviewer_ids", [])
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    data, ct = get_object(f["storage_path"])
    return StreamingResponse(BytesIO(data), media_type=f.get("content_type", ct),
                             headers={"Content-Disposition": f'attachment; filename="{f["original_filename"]}"'})

@api_router.get("/files/{file_id}/preview")
async def preview_file(file_id: str, token: Optional[str] = Query(None), request: Request = None):
    # Support query-param token for <iframe> embedding
    user = None
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    f = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    p = await db.papers.find_one({"id": f["paper_id"]}, {"_id": 0})
    role = user["role"]
    allowed = role in ("admin", "editor") or p["author_id"] == user["id"] or user["id"] in p.get("reviewer_ids", [])
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    data, ct = get_object(f["storage_path"])
    return FastResponse(content=data, media_type=f.get("content_type", ct),
                        headers={"Content-Disposition": f'inline; filename="{f["original_filename"]}"'})

@api_router.post("/papers/{paper_id}/upload-final")
async def upload_final_pdf(paper_id: str, file: UploadFile = File(...), user: dict = Depends(require_roles("editor"))):
    """Editor/admin uploads the FINAL version of the PDF (post-review) before publishing."""
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ("pdf",):
        raise HTTPException(status_code=400, detail="Only PDF allowed for final version")
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/papers/{p['author_id']}/final_{file_id}.pdf"
    result = put_object(path, data, "application/pdf")
    await db.files.insert_one({
        "id": file_id,
        "paper_id": paper_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": "application/pdf",
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "is_deleted": False,
        "kind": "final",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.papers.update_one({"id": paper_id}, {"$set": {
        "final_file_id": file_id,
        "final_file_name": file.filename,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"file_id": file_id, "filename": file.filename}

@api_router.get("/public/paper/{paper_id}/pdf")
async def public_paper_pdf(paper_id: str):
    """Stream the final PDF of a PUBLISHED paper — fully public."""
    p = await db.papers.find_one({"id": paper_id, "status": "published"}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Published paper not found")
    fid = p.get("final_file_id") or p.get("file_id")
    if not fid:
        raise HTTPException(status_code=404, detail="No file attached")
    f = await db.files.find_one({"id": fid, "is_deleted": False}, {"_id": 0})
    if not f:
        raise HTTPException(status_code=404, detail="File missing")
    data, ct = get_object(f["storage_path"])
    return FastResponse(content=data, media_type=f.get("content_type", ct),
                        headers={"Content-Disposition": f'inline; filename="{f["original_filename"]}"'})

# ==================== JOURNAL PUBLICATION REQUESTS ====================
@api_router.post("/papers/{paper_id}/journal-request")
async def create_journal_request(paper_id: str, body: JournalRequestIn, user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    if p["author_id"] != user["id"] and user["role"] not in ("admin",):
        raise HTTPException(status_code=403, detail="Only the paper author can submit a journal request")
    if p["status"] != "published":
        raise HTTPException(status_code=400, detail="Paper must be published before requesting journal publication")
    # Upsert by (paper_id, author_id)
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.journal_requests.find_one({"paper_id": paper_id}, {"_id": 0})
    doc = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "paper_id": paper_id,
        "paper_title": p["title"],
        "author_id": p["author_id"],
        "author_name": p["author_name"],
        "journal_name": body.journal_name,
        "journal_url": body.journal_url or "",
        "journal_fee": body.journal_fee or "",
        "note": body.note or "",
        "status": existing["status"] if existing else "pending",
        "created_at": existing["created_at"] if existing else now,
        "updated_at": now,
    }
    if existing:
        await db.journal_requests.update_one({"id": existing["id"]}, {"$set": doc})
    else:
        await db.journal_requests.insert_one(doc)
    # Strip mongo _id (motor mutates the dict on insert) before returning
    doc.pop("_id", None)
    # Notify editors
    editors = await db.users.find({"role": {"$in": ["editor", "admin"]}}, {"_id": 0, "id": 1}).to_list(100)
    for e in editors:
        await notify(e["id"], "Journal Publication Request",
                     f"Author '{p['author_name']}' wants to publish '{p['title']}' in {body.journal_name}.",
                     "/dashboard/journal-requests", send_email_flag=False)
    return doc

@api_router.get("/papers/{paper_id}/journal-request")
async def get_journal_request(paper_id: str, user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    allowed = user["role"] in ("admin", "editor") or p["author_id"] == user["id"]
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    req = await db.journal_requests.find_one({"paper_id": paper_id}, {"_id": 0})
    return req or {}

@api_router.get("/journal-requests")
async def list_journal_requests(user: dict = Depends(require_roles("editor"))):
    items = await db.journal_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items

@api_router.patch("/journal-requests/{req_id}")
async def update_journal_request(req_id: str, body: dict, user: dict = Depends(require_roles("editor"))):
    allowed = {k: v for k, v in body.items() if k in ("status", "note")}
    if not allowed:
        raise HTTPException(status_code=400, detail="Nothing to update")
    allowed["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.journal_requests.update_one({"id": req_id}, {"$set": allowed})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"ok": True}

# ==================== REVIEWS ====================
@api_router.post("/papers/{paper_id}/assign-reviewers")
async def assign_reviewers(paper_id: str, body: AssignReviewersIn, user: dict = Depends(require_roles("editor"))):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    # Validate reviewer ids
    valid = await db.users.find({"id": {"$in": body.reviewer_ids}, "role": {"$in": ["reviewer", "editor", "admin"]}}, {"_id": 0, "id": 1}).to_list(50)
    valid_ids = [v["id"] for v in valid]
    if len(valid_ids) == 0:
        raise HTTPException(status_code=400, detail="No valid reviewers")
    await db.papers.update_one({"id": paper_id}, {"$set": {
        "reviewer_ids": valid_ids, "status": "under_review",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    for rid in valid_ids:
        await notify(rid, "Review Assigned", f"You were assigned to review '{p['title']}'.", f"/dashboard/papers/{paper_id}", send_email_flag=True)
    await notify(p["author_id"], "Review Started", f"Your paper '{p['title']}' is now under review.", f"/dashboard/papers/{paper_id}")
    return {"ok": True, "reviewer_ids": valid_ids}

@api_router.post("/papers/{paper_id}/reviews")
async def submit_review(paper_id: str, body: ReviewIn, user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    if user["id"] not in p.get("reviewer_ids", []) and user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="You are not a reviewer of this paper")
    # Update if exists
    existing = await db.reviews.find_one({"paper_id": paper_id, "reviewer_id": user["id"]}, {"_id": 0})
    review = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "paper_id": paper_id,
        "reviewer_id": user["id"],
        "reviewer_name": user["name"],
        "score": body.score,
        "recommendation": body.recommendation,
        "comments": body.comments,
        "confidential_notes": body.confidential_notes or "",
        "created_at": existing["created_at"] if existing else datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if existing:
        await db.reviews.update_one({"id": existing["id"]}, {"$set": review})
    else:
        await db.reviews.insert_one(review)
    # Notify editors
    editors = await db.users.find({"role": {"$in": ["editor", "admin"]}}, {"_id": 0, "id": 1}).to_list(100)
    for e in editors:
        await notify(e["id"], "Review Submitted", f"Review submitted for '{p['title']}'", f"/dashboard/papers/{paper_id}")
    return {"ok": True, "review_id": review["id"]}

@api_router.get("/papers/{paper_id}/reviews")
async def list_reviews(paper_id: str, user: dict = Depends(get_current_user)):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    role = user["role"]
    reviews = await db.reviews.find({"paper_id": paper_id}, {"_id": 0}).to_list(100)
    if role == "reviewer":
        # Reviewer sees only their own
        reviews = [r for r in reviews if r["reviewer_id"] == user["id"]]
    elif role == "author":
        # Author sees comments only after decision is made (or paper status not 'under_review')
        if p["author_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
        if p["status"] in ("under_review", "submitted"):
            return []
        # Strip confidential
        reviews = [{**r, "confidential_notes": "", "reviewer_name": "Reviewer"} for r in reviews]
    return reviews

# ==================== DECISIONS ====================
@api_router.post("/papers/{paper_id}/decision")
async def make_decision(paper_id: str, body: DecisionIn, user: dict = Depends(require_roles("editor"))):
    p = await db.papers.find_one({"id": paper_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Paper not found")
    status_map = {"accept": "accepted", "reject": "rejected",
                  "revision_required": "revision_required", "publish": "published"}
    new_status = status_map[body.decision]
    update_doc = {
        "status": new_status, "decision": body.decision, "decision_note": body.note,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if body.decision == "publish":
        doi = body.doi or f"10.9999/seaipc2026.{paper_id[:8]}"
        update_doc["doi"] = doi
        # Pick final_file_id: explicit body override, else keep existing, else fall back to latest author file
        current_final = p.get("final_file_id")
        if body.final_file_id:
            update_doc["final_file_id"] = body.final_file_id
            # Resolve filename
            f = await db.files.find_one({"id": body.final_file_id}, {"_id": 0})
            if f:
                update_doc["final_file_name"] = f["original_filename"]
        elif not current_final and p.get("file_id"):
            update_doc["final_file_id"] = p["file_id"]
            update_doc["final_file_name"] = p.get("file_name")
    await db.papers.update_one({"id": paper_id}, {"$set": update_doc})
    title_msg = {
        "accept": "Paper Accepted", "reject": "Paper Rejected",
        "revision_required": "Revision Required", "publish": "Paper Published"
    }[body.decision]
    await notify(p["author_id"], title_msg, f"Decision on '{p['title']}': {body.decision}. {body.note}", f"/dashboard/papers/{paper_id}", send_email_flag=True)
    return {"ok": True, "status": new_status}

# ==================== NOTIFICATIONS ====================
@api_router.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return items

@api_router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

@api_router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

# ==================== STATS ====================
@api_router.get("/stats")
async def stats(user: dict = Depends(get_current_user)):
    role = user["role"]
    base = {}
    if role == "author":
        base["my_papers"] = await db.papers.count_documents({"author_id": user["id"]})
        base["under_review"] = await db.papers.count_documents({"author_id": user["id"], "status": "under_review"})
        base["accepted"] = await db.papers.count_documents({"author_id": user["id"], "status": {"$in": ["accepted", "published"]}})
    elif role == "reviewer":
        base["assigned"] = await db.papers.count_documents({"reviewer_ids": user["id"]})
        base["pending"] = await db.papers.count_documents({"reviewer_ids": user["id"], "status": "under_review"})
        base["completed"] = await db.reviews.count_documents({"reviewer_id": user["id"]})
    else:  # editor/admin
        base["total_papers"] = await db.papers.count_documents({})
        base["pending_review"] = await db.papers.count_documents({"status": {"$in": ["submitted", "resubmitted"]}})
        base["under_review"] = await db.papers.count_documents({"status": "under_review"})
        base["published"] = await db.papers.count_documents({"status": "published"})
        base["users"] = await db.users.count_documents({})
    return base

# ==================== HEALTH ====================
@api_router.get("/")
async def root():
    return {"message": "OJS API ready"}

# ==================== STARTUP ====================
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.papers.create_index("id", unique=True)
    await db.papers.create_index("author_id")
    await db.reviews.create_index([("paper_id", 1), ("reviewer_id", 1)], unique=True)
    await db.notifications.create_index("user_id")
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.site_content.create_index("id", unique=True)
    await db.journal_requests.create_index("id", unique=True)
    await db.journal_requests.create_index("paper_id", unique=True)
    # Seed default content if missing
    if not await db.site_content.find_one({"id": "singleton"}):
        await db.site_content.insert_one({**DEFAULT_CONTENT})
        logger.info("Seeded default site_content")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ojs.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "System Admin",
            "affiliation": "OJS",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

    # Seed demo users (one per role) if not exists
    demo_users = [
        ("author@ojs.com", "author123", "Demo Author", "author"),
        ("reviewer@ojs.com", "reviewer123", "Demo Reviewer", "reviewer"),
        ("editor@ojs.com", "editor123", "Demo Editor", "editor"),
    ]
    for email, pw, name, role in demo_users:
        if not await db.users.find_one({"email": email}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": email,
                "password_hash": hash_password(pw),
                "name": name,
                "affiliation": "OJS",
                "role": role,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    # Init storage
    init_storage()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Routes & CORS
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://seaipc2026.imz.or.id",
        "https://seaipc2026.imz.or.id",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.preview\.emergentagent\.com",
    allow_methods=["*"],
    allow_headers=["*"],
)
