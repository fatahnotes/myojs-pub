"""
SEAIPC 2026 OJS v2 - new features regression tests:
  - POST /api/papers/{id}/upload-final (editor uploads final PDF)
  - GET  /api/public/paper/{id}/pdf (public download stream)
  - POST /api/papers/{id}/decision (final_file_id fallback logic on publish)
  - POST /api/papers/{id}/journal-request (author submit + upsert)
  - GET  /api/papers/{id}/journal-request (author/editor read)
  - GET  /api/journal-requests (editor-only list)
  - PATCH /api/journal-requests/{id} (editor-only status update)
  - GET /api/content cfp.publications migrated to list[{name,url,fee}]
"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://paper-review-flow.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@ojs.com", "admin123")
EDITOR = ("editor@ojs.com", "editor123")
AUTHOR = ("author@ojs.com", "author123")
REVIEWER = ("reviewer@ojs.com", "reviewer123")


# ---------- helpers ----------
def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    j = r.json()
    # login returns flat user shape with token field
    return j["token"], j


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


def _create_published_paper(author_tok, editor_tok, title_prefix="TEST_v2"):
    """Create paper as author, upload PDF, and have editor publish it (no final PDF override).
    Returns (paper_id, file_id)."""
    title = f"{title_prefix}_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/papers", headers=_hdr(author_tok), json={
        "title": title, "abstract": "abs", "keywords": ["x"], "co_authors": []
    }, timeout=30)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    pdf = b"%PDF-1.4\nAUTHOR\n%%EOF\n"
    up = requests.post(f"{API}/papers/{pid}/upload", headers=_hdr(author_tok),
                       files={"file": ("a.pdf", io.BytesIO(pdf), "application/pdf")}, timeout=60)
    if up.status_code == 500 and "Storage" in up.text:
        pytest.skip("Storage unavailable")
    assert up.status_code == 200, up.text
    fid = up.json()["file_id"]
    # Publish without override; backend should fallback to author's file_id as final_file_id
    r = requests.post(f"{API}/papers/{pid}/decision", headers=_hdr(editor_tok),
                      json={"decision": "publish", "note": "ok"}, timeout=30)
    assert r.status_code == 200, r.text
    return pid, fid


# ---------- Final PDF upload ----------
class TestUploadFinal:
    def test_upload_final_editor_ok(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        # Create paper as author with original PDF
        title = f"TEST_final_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": title, "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        up = requests.post(f"{API}/papers/{pid}/upload", headers=_hdr(a_tok),
                           files={"file": ("orig.pdf", io.BytesIO(b"%PDF-1.4\nA\n%%EOF"), "application/pdf")}, timeout=60)
        if up.status_code == 500 and "Storage" in up.text:
            pytest.skip("Storage unavailable")
        # Editor uploads final
        final_pdf = b"%PDF-1.4\nFINAL\n%%EOF"
        r = requests.post(f"{API}/papers/{pid}/upload-final", headers=_hdr(e_tok),
                          files={"file": ("final.pdf", io.BytesIO(final_pdf), "application/pdf")}, timeout=60)
        if r.status_code == 500 and "Storage" in r.text:
            pytest.skip("Storage unavailable")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["filename"] == "final.pdf"
        assert "file_id" in body
        # Verify paper has final_file_id set
        r = requests.get(f"{API}/papers/{pid}", headers=_hdr(e_tok), timeout=30)
        p = r.json()
        assert p["final_file_id"] == body["file_id"]
        assert p["final_file_name"] == "final.pdf"

    def test_upload_final_non_editor_forbidden(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        # Make a paper as author
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": f"TEST_f403_{uuid.uuid4().hex[:6]}", "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        # Author tries to upload final -> 403
        r = requests.post(f"{API}/papers/{pid}/upload-final", headers=_hdr(a_tok),
                          files={"file": ("f.pdf", io.BytesIO(b"%PDF"), "application/pdf")}, timeout=30)
        assert r.status_code == 403

    def test_upload_final_rejects_non_pdf(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": f"TEST_fext_{uuid.uuid4().hex[:6]}", "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        r = requests.post(f"{API}/papers/{pid}/upload-final", headers=_hdr(e_tok),
                          files={"file": ("f.docx", io.BytesIO(b"junk"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}, timeout=30)
        assert r.status_code == 400
        assert "PDF" in r.text or "pdf" in r.text


# ---------- Public PDF endpoint ----------
class TestPublicPaperPdf:
    def test_public_pdf_published_no_auth(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        pid, _fid = _create_published_paper(a_tok, e_tok, "TEST_pub_pdf")
        # NO auth header
        r = requests.get(f"{API}/public/paper/{pid}/pdf", timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "pdf" in ct.lower() or "octet" in ct.lower(), f"Unexpected content-type: {ct}"
        cd = r.headers.get("content-disposition", "")
        assert "inline" in cd.lower(), f"Expected inline, got: {cd}"
        assert r.content.startswith(b"%PDF") or len(r.content) > 0

    def test_public_pdf_unpublished_404(self):
        a_tok, _ = _login(*AUTHOR)
        # Create un-published paper
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": f"TEST_unpub_{uuid.uuid4().hex[:6]}", "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        r = requests.get(f"{API}/public/paper/{pid}/pdf", timeout=30)
        assert r.status_code == 404

    def test_public_pdf_unknown_paper_404(self):
        r = requests.get(f"{API}/public/paper/{uuid.uuid4()}/pdf", timeout=30)
        assert r.status_code == 404


# ---------- Decision final_file_id logic ----------
class TestDecisionFinalFileId:
    def test_publish_falls_back_to_author_file_id(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        pid, fid = _create_published_paper(a_tok, e_tok, "TEST_dec_fb")
        r = requests.get(f"{API}/papers/{pid}", headers=_hdr(e_tok), timeout=30)
        p = r.json()
        assert p["status"] == "published"
        assert p.get("final_file_id") == fid

    def test_publish_with_explicit_final_file_id(self):
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        # Create paper + author upload (file_id_a)
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": f"TEST_dec_explicit_{uuid.uuid4().hex[:6]}", "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        up = requests.post(f"{API}/papers/{pid}/upload", headers=_hdr(a_tok),
                           files={"file": ("a.pdf", io.BytesIO(b"%PDF-1.4\nA\n%%EOF"), "application/pdf")}, timeout=60)
        if up.status_code == 500 and "Storage" in up.text:
            pytest.skip("Storage unavailable")
        # Editor uploads final
        ufin = requests.post(f"{API}/papers/{pid}/upload-final", headers=_hdr(e_tok),
                             files={"file": ("final.pdf", io.BytesIO(b"%PDF-1.4\nFIN\n%%EOF"), "application/pdf")}, timeout=60)
        if ufin.status_code == 500 and "Storage" in ufin.text:
            pytest.skip("Storage unavailable")
        final_fid = ufin.json()["file_id"]
        # Now publish with explicit final_file_id (use the same to assert it's stored)
        r = requests.post(f"{API}/papers/{pid}/decision", headers=_hdr(e_tok),
                          json={"decision": "publish", "note": "", "final_file_id": final_fid}, timeout=30)
        assert r.status_code == 200, r.text
        # Verify
        r = requests.get(f"{API}/papers/{pid}", headers=_hdr(e_tok), timeout=30)
        p = r.json()
        assert p["status"] == "published"
        assert p["final_file_id"] == final_fid
        assert p["final_file_name"] == "final.pdf"


# ---------- Journal Requests ----------
class TestJournalRequests:
    @pytest.fixture(scope="class")
    def published_setup(self):
        a_tok, a_user = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        pid, _fid = _create_published_paper(a_tok, e_tok, "TEST_jr_paper")
        return {"a_tok": a_tok, "a_user": a_user, "e_tok": e_tok, "pid": pid}

    def test_create_journal_request_author_ok(self, published_setup):
        ctx = published_setup
        body = {"journal_name": "Test Journal Alpha", "journal_url": "https://example.com/alpha",
                "journal_fee": "USD 100", "note": "please review"}
        r = requests.post(f"{API}/papers/{ctx['pid']}/journal-request",
                          headers=_hdr(ctx["a_tok"]), json=body, timeout=30)
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["journal_name"] == "Test Journal Alpha"
        assert doc["journal_url"] == "https://example.com/alpha"
        assert doc["journal_fee"] == "USD 100"
        assert doc["note"] == "please review"
        assert doc["status"] == "pending"
        assert doc["paper_id"] == ctx["pid"]
        assert doc["author_id"] == ctx["a_user"]["id"]
        assert "id" in doc

    def test_create_journal_request_upsert(self, published_setup):
        ctx = published_setup
        # First call captured request id; call again with different journal_name
        first_get = requests.get(f"{API}/papers/{ctx['pid']}/journal-request",
                                 headers=_hdr(ctx["a_tok"]), timeout=30).json()
        original_id = first_get["id"]
        original_created_at = first_get["created_at"]
        body = {"journal_name": "Test Journal Beta", "journal_url": "https://example.com/beta",
                "journal_fee": "USD 200", "note": "updated"}
        r = requests.post(f"{API}/papers/{ctx['pid']}/journal-request",
                          headers=_hdr(ctx["a_tok"]), json=body, timeout=30)
        assert r.status_code == 200
        doc = r.json()
        assert doc["id"] == original_id, "Upsert should preserve id"
        assert doc["created_at"] == original_created_at, "created_at should not change on upsert"
        assert doc["journal_name"] == "Test Journal Beta"
        assert doc["journal_fee"] == "USD 200"

    def test_get_journal_request_author(self, published_setup):
        ctx = published_setup
        r = requests.get(f"{API}/papers/{ctx['pid']}/journal-request",
                         headers=_hdr(ctx["a_tok"]), timeout=30)
        assert r.status_code == 200
        doc = r.json()
        assert doc.get("paper_id") == ctx["pid"]

    def test_get_journal_request_empty_dict_when_none(self):
        # Create a fresh published paper (no journal request yet)
        a_tok, _ = _login(*AUTHOR)
        e_tok, _ = _login(*EDITOR)
        pid, _ = _create_published_paper(a_tok, e_tok, "TEST_jr_empty")
        r = requests.get(f"{API}/papers/{pid}/journal-request",
                         headers=_hdr(a_tok), timeout=30)
        assert r.status_code == 200
        assert r.json() == {}

    def test_create_journal_request_unpublished_400(self):
        a_tok, _ = _login(*AUTHOR)
        # Unpublished paper
        r = requests.post(f"{API}/papers", headers=_hdr(a_tok), json={
            "title": f"TEST_jr_unpub_{uuid.uuid4().hex[:6]}", "abstract": "x", "keywords": [], "co_authors": []
        }, timeout=30)
        pid = r.json()["id"]
        r = requests.post(f"{API}/papers/{pid}/journal-request",
                          headers=_hdr(a_tok), json={"journal_name": "X"}, timeout=30)
        assert r.status_code == 400

    def test_create_journal_request_other_author_403(self, published_setup):
        ctx = published_setup
        # Register a fresh author and try to submit on someone else's paper
        other_email = f"other_{uuid.uuid4().hex[:6]}@example.com"
        rr = requests.post(f"{API}/auth/register", json={
            "email": other_email, "password": "pass1234", "name": "Other Author"
        }, timeout=30)
        assert rr.status_code == 200
        other_tok = rr.json()["token"]
        other_id = rr.json()["id"]
        r = requests.post(f"{API}/papers/{ctx['pid']}/journal-request",
                          headers=_hdr(other_tok), json={"journal_name": "X"}, timeout=30)
        assert r.status_code == 403
        # Cleanup
        ad_tok, _ = _login(*ADMIN)
        requests.delete(f"{API}/users/{other_id}", headers=_hdr(ad_tok), timeout=15)

    def test_list_journal_requests_editor_ok(self, published_setup):
        ctx = published_setup
        r = requests.get(f"{API}/journal-requests", headers=_hdr(ctx["e_tok"]), timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # Our paper's request should be in the list
        assert any(x["paper_id"] == ctx["pid"] for x in items)

    def test_list_journal_requests_author_403(self, published_setup):
        ctx = published_setup
        r = requests.get(f"{API}/journal-requests", headers=_hdr(ctx["a_tok"]), timeout=30)
        assert r.status_code == 403

    def test_list_journal_requests_reviewer_403(self):
        rv_tok, _ = _login(*REVIEWER)
        r = requests.get(f"{API}/journal-requests", headers=_hdr(rv_tok), timeout=30)
        assert r.status_code == 403

    def test_patch_journal_request_editor_ok(self, published_setup):
        ctx = published_setup
        # Find the request id
        r = requests.get(f"{API}/journal-requests", headers=_hdr(ctx["e_tok"]), timeout=30)
        match = next((x for x in r.json() if x["paper_id"] == ctx["pid"]), None)
        assert match is not None
        rid = match["id"]
        # PATCH status
        r = requests.patch(f"{API}/journal-requests/{rid}",
                           headers=_hdr(ctx["e_tok"]),
                           json={"status": "approved", "note": "good to go"}, timeout=30)
        assert r.status_code == 200
        # Verify persistence via GET list
        r = requests.get(f"{API}/journal-requests", headers=_hdr(ctx["e_tok"]), timeout=30)
        match = next((x for x in r.json() if x["id"] == rid), None)
        assert match["status"] == "approved"
        assert match["note"] == "good to go"

    def test_patch_journal_request_author_403(self, published_setup):
        ctx = published_setup
        r = requests.get(f"{API}/journal-requests", headers=_hdr(ctx["e_tok"]), timeout=30)
        match = next((x for x in r.json() if x["paper_id"] == ctx["pid"]), None)
        rid = match["id"]
        r = requests.patch(f"{API}/journal-requests/{rid}",
                           headers=_hdr(ctx["a_tok"]),
                           json={"status": "rejected"}, timeout=30)
        assert r.status_code == 403

    def test_patch_journal_request_unknown_404(self):
        e_tok, _ = _login(*EDITOR)
        r = requests.patch(f"{API}/journal-requests/{uuid.uuid4()}",
                           headers=_hdr(e_tok),
                           json={"status": "approved"}, timeout=30)
        assert r.status_code == 404


# ---------- Publications migration ----------
class TestPublicationsMigration:
    def test_content_publications_are_objects(self):
        r = requests.get(f"{API}/content", timeout=30)
        assert r.status_code == 200
        data = r.json()
        cfp = data.get("cfp") or {}
        pubs = cfp.get("publications") or []
        assert isinstance(pubs, list)
        assert len(pubs) > 0, "Expected default publications"
        for p in pubs:
            assert isinstance(p, dict), f"Publication should be dict, got: {type(p)} -> {p}"
            assert "name" in p
            assert "url" in p
            assert "fee" in p

    def test_content_publications_string_migration(self):
        """If admin saves publications as bare strings, GET should auto-migrate them to objects."""
        ad_tok, _ = _login(*ADMIN)
        # Snapshot original
        orig = requests.get(f"{API}/content", timeout=30).json()
        orig_pubs = (orig.get("cfp") or {}).get("publications") or []
        # PUT with strings (legacy shape)
        legacy = ["TEST_LegacyJournal_A", "TEST_LegacyJournal_B"]
        new_cfp = {**(orig.get("cfp") or {}), "publications": legacy}
        r = requests.put(f"{API}/content", headers=_hdr(ad_tok),
                         json={"cfp": new_cfp}, timeout=30)
        assert r.status_code == 200, r.text
        # GET should return them as objects (migrated)
        r = requests.get(f"{API}/content", timeout=30)
        pubs = (r.json().get("cfp") or {}).get("publications") or []
        legacy_objs = [p for p in pubs if isinstance(p, dict) and p.get("name", "").startswith("TEST_LegacyJournal_")]
        assert len(legacy_objs) == 2
        for p in legacy_objs:
            assert p["url"] == ""
            assert p["fee"] == ""
        # Restore original
        rest_cfp = {**(orig.get("cfp") or {}), "publications": orig_pubs}
        requests.put(f"{API}/content", headers=_hdr(ad_tok),
                     json={"cfp": rest_cfp}, timeout=30)
