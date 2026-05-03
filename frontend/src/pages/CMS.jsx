import { useState, useEffect } from "react";
import { useContent } from "@/lib/content";
import { PALETTES } from "@/lib/palettes";
import { api, formatApiError, API } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, UploadCloud, Check, ImageIcon, Save, Mail, Send, Eye, EyeOff } from "lucide-react";

function resolveUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("/api")) return `${process.env.REACT_APP_BACKEND_URL}${u}`;
  return u;
}

function SaveBar({ onSave, saving, dirty }) {
  return (
    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
      {dirty && <span className="text-xs text-amber-600 font-mono">Unsaved changes</span>}
      <Button
        data-testid="cms-save-btn"
        onClick={onSave}
        disabled={saving}
        className="rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white"
      >
        <Save size={14} className="mr-2" /> {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

// ======================= THEME TAB =======================
function ThemeTab({ content, onSave }) {
  const [theme, setTheme] = useState(content.theme || "blue-classic");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setTheme(content.theme || "blue-classic"); }, [content.theme]);

  const save = async () => {
    setSaving(true);
    try { await onSave({ theme }); toast.success("Theme updated"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-6">
      <div>
        <div className="overline text-gray-500 mb-3">— Palette</div>
        <p className="text-sm text-gray-600 mb-6">Pick a color palette. All primary buttons, accents, and highlights across the public site will update instantly after save.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PALETTES.map((p) => {
            const selected = theme === p.key;
            return (
              <button
                key={p.key}
                data-testid={`palette-${p.key}`}
                type="button"
                onClick={() => setTheme(p.key)}
                className={`text-left border p-4 transition-base ${selected ? "border-gray-900 shadow-sm" : "border-gray-300 hover:border-gray-600"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex -space-x-1">
                    <span className="w-6 h-6 rounded-full border-2 border-white" style={{ background: p.primary }}></span>
                    <span className="w-6 h-6 rounded-full border-2 border-white" style={{ background: p.hover }}></span>
                    <span className="w-6 h-6 rounded-full border-2 border-white" style={{ background: p.soft }}></span>
                  </div>
                  {selected && <Check size={16} className="text-green-600" />}
                </div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-gray-500 mt-1">{p.description}</div>
                <div className="font-mono text-[10px] text-gray-400 mt-2">{p.primary}</div>
              </button>
            );
          })}
        </div>
      </div>
      <SaveBar onSave={save} saving={saving} dirty={theme !== content.theme} />
    </div>
  );
}

// ======================= BRANDING TAB =======================
function BrandingTab({ content, onSave }) {
  const [b, setB] = useState(content.branding || {});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setB(content.branding || {}); }, [content.branding]);

  const uploadLogo = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/content/logo/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setB({ ...b, logo_url: data.url, logo_file_id: data.file_id });
      toast.success("Logo uploaded. Remember to save.");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try { await onSave({ branding: b }); toast.success("Branding saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const fields = [
    { k: "conf_short", label: "Conference Short Name", placeholder: "SEAIPC 2026" },
    { k: "conf_full", label: "Conference Full Name" },
    { k: "conf_location", label: "Location", placeholder: "Jakarta / Bogor, Indonesia" },
    { k: "conf_date", label: "Date", placeholder: "26 – 27 August 2026" },
    { k: "conf_theme", label: "Conference Theme" },
    { k: "hero_overline", label: "Hero Overline", placeholder: "— Vol. 09 · ..." },
    { k: "hero_title", label: "Hero Title 1" },
    { k: "hero_title2", label: "Hero Title 2 (subtitle)" },
    { k: "hero_subtitle", label: "Hero Paragraph", textarea: true },
  ];
  return (
    <div className="space-y-6">
      <div>
        <div className="overline text-gray-500 mb-3">— Logo</div>
        <div className="flex items-center gap-6 border border-gray-300 p-4 bg-white">
          <div className="w-28 h-28 border border-gray-300 flex items-center justify-center bg-gray-50">
            {b.logo_url ? (
              <img src={resolveUrl(b.logo_url)} alt="logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon size={32} className="text-gray-300" />
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="logo-input" className="flex items-center gap-3 border border-dashed border-gray-300 px-4 py-3 cursor-pointer hover:border-[var(--brand)] transition-base max-w-md">
              <UploadCloud size={18} className="text-gray-500" />
              <div className="text-sm">{uploading ? "Uploading..." : "Click to upload PNG / JPG / SVG / WEBP (≤10MB)"}</div>
            </label>
            <input id="logo-input" data-testid="logo-upload-input" type="file" accept=".png,.jpg,.jpeg,.svg,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            {b.logo_url && (
              <button type="button" onClick={() => setB({ ...b, logo_url: "", logo_file_id: "" })} className="text-xs text-red-600 hover:underline mt-2" data-testid="remove-logo">Remove logo</button>
            )}
            <p className="text-xs text-gray-500 mt-2">Displayed in the top-left of every page and in the dashboard sidebar.</p>
          </div>
        </div>
      </div>

      <div>
        <div className="overline text-gray-500 mb-3">— Text</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.k} className={f.textarea ? "md:col-span-2" : ""}>
              <Label className="text-xs uppercase tracking-wider">{f.label}</Label>
              {f.textarea ? (
                <Textarea data-testid={`branding-${f.k}`} rows={4} value={b[f.k] || ""} onChange={(e)=>setB({...b, [f.k]: e.target.value})} className="rounded-sm mt-2" />
              ) : (
                <Input data-testid={`branding-${f.k}`} placeholder={f.placeholder} value={b[f.k] || ""} onChange={(e)=>setB({...b, [f.k]: e.target.value})} className="rounded-sm mt-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="overline text-gray-500 mb-3">— Hero Stats</div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label className="text-xs uppercase tracking-wider">Edition</Label><Input data-testid="branding-stat_edition" value={b.stat_edition || ""} onChange={(e)=>setB({...b, stat_edition: e.target.value})} className="rounded-sm mt-2" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Tracks</Label><Input data-testid="branding-stat_tracks" value={b.stat_tracks || ""} onChange={(e)=>setB({...b, stat_tracks: e.target.value})} className="rounded-sm mt-2" /></div>
          <div><Label className="text-xs uppercase tracking-wider">Journals</Label><Input data-testid="branding-stat_journals" value={b.stat_journals || ""} onChange={(e)=>setB({...b, stat_journals: e.target.value})} className="rounded-sm mt-2" /></div>
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(b) !== JSON.stringify(content.branding)} />
    </div>
  );
}

// ======================= FLYER TAB =======================
function FlyerTab({ content, onSave }) {
  const [f, setF] = useState(content.flyer || {});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { setF(content.flyer || {}); }, [content.flyer]);

  const uploadFlyer = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/content/flyer/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setF({ ...f, image_url: data.url, image_file_id: data.file_id, enabled: true });
      toast.success("Flyer uploaded. Remember to save.");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try { await onSave({ flyer: f }); toast.success("Flyer saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border border-gray-300 p-4 bg-white">
        <div>
          <div className="font-semibold text-sm">Show flyer section on Home</div>
          <div className="text-xs text-gray-500">Appears above "Important Dates"</div>
        </div>
        <Switch data-testid="flyer-enabled" checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
      </div>

      <div>
        <div className="overline text-gray-500 mb-3">— Flyer Image</div>
        <div className="flex items-start gap-6 border border-gray-300 p-4 bg-white">
          <div className="w-40 h-56 border border-gray-300 flex items-center justify-center bg-gray-50 shrink-0">
            {f.image_url ? (
              <img src={resolveUrl(f.image_url)} alt="flyer" className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon size={32} className="text-gray-300" />
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="flyer-input" className="flex items-center gap-3 border border-dashed border-gray-300 px-4 py-3 cursor-pointer hover:border-[var(--brand)] transition-base">
              <UploadCloud size={18} className="text-gray-500" />
              <div className="text-sm">{uploading ? "Uploading..." : "Click to upload flyer (PNG / JPG / WEBP / PDF, ≤10MB)"}</div>
            </label>
            <input id="flyer-input" data-testid="flyer-upload-input" type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFlyer(e.target.files[0])} />
            <p className="text-xs text-gray-500 mt-2">PDF flyers will be downloadable; image flyers render on the homepage above Important Dates.</p>
            {f.image_url && (
              <button type="button" onClick={() => setF({ ...f, image_url: "", image_file_id: "" })} className="text-xs text-red-600 hover:underline mt-2" data-testid="remove-flyer">Remove image</button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider">Title</Label>
          <Input data-testid="flyer-title" value={f.title || ""} onChange={(e)=>setF({...f, title: e.target.value})} className="rounded-sm mt-2" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">External Download URL (optional)</Label>
          <Input data-testid="flyer-download-url" value={f.download_url || ""} placeholder="https://..." onChange={(e)=>setF({...f, download_url: e.target.value})} className="rounded-sm mt-2" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wider">Caption</Label>
          <Textarea data-testid="flyer-caption" rows={3} value={f.caption || ""} onChange={(e)=>setF({...f, caption: e.target.value})} className="rounded-sm mt-2" />
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(f) !== JSON.stringify(content.flyer)} />
    </div>
  );
}

// ======================= DATES TAB =======================
function DatesTab({ content, onSave }) {
  const [dates, setDates] = useState(content.dates || []);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDates(content.dates || []); }, [content.dates]);

  const update = (i, k, v) => { const n = [...dates]; n[i] = { ...n[i], [k]: v }; setDates(n); };
  const add = () => setDates([...dates, { tag: "Event", label: "", date: "" }]);
  const remove = (i) => setDates(dates.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try { await onSave({ dates }); toast.success("Dates saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <div className="overline text-gray-500">— Important Dates ({dates.length})</div>
      {dates.map((d, i) => (
        <div key={i} data-testid={`date-item-${i}`} className="grid grid-cols-12 gap-3 items-center border border-gray-300 bg-white p-3">
          <div className="col-span-2"><Input placeholder="Tag" value={d.tag || ""} onChange={(e)=>update(i, "tag", e.target.value)} className="rounded-sm" /></div>
          <div className="col-span-5"><Input placeholder="Label (e.g. Abstract Submission)" value={d.label || ""} onChange={(e)=>update(i, "label", e.target.value)} className="rounded-sm" /></div>
          <div className="col-span-4"><Input placeholder="Date (e.g. 15 May 2026)" value={d.date || ""} onChange={(e)=>update(i, "date", e.target.value)} className="rounded-sm" /></div>
          <div className="col-span-1 flex justify-end">
            <button onClick={() => remove(i)} data-testid={`remove-date-${i}`} className="text-red-600 hover:text-red-700"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
      <Button data-testid="add-date-btn" variant="outline" className="rounded-sm" onClick={add}><Plus size={14} className="mr-2" /> Add Date</Button>
      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(dates) !== JSON.stringify(content.dates)} />
    </div>
  );
}

// ======================= ABOUT TAB =======================
function AboutTab({ content, onSave }) {
  const [a, setA] = useState(content.about || {});
  const [saving, setSaving] = useState(false);
  useEffect(() => { setA(content.about || {}); }, [content.about]);

  const updateList = (key, i, v) => { const arr = [...(a[key] || [])]; arr[i] = v; setA({...a, [key]: arr}); };
  const addTo = (key) => setA({ ...a, [key]: [...(a[key] || []), ""] });
  const removeFrom = (key, i) => setA({ ...a, [key]: (a[key] || []).filter((_, j) => j !== i) });

  const save = async () => {
    setSaving(true);
    try { await onSave({ about: a }); toast.success("About saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const listSection = (key, label) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase tracking-wider">{label}</Label>
        <Button variant="ghost" size="sm" className="rounded-sm" onClick={() => addTo(key)} data-testid={`add-${key}`}><Plus size={12} className="mr-1" /> Add</Button>
      </div>
      <div className="space-y-2">
        {(a[key] || []).map((v, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Textarea rows={2} value={v} onChange={(e)=>updateList(key, i, e.target.value)} className="rounded-sm flex-1" data-testid={`${key}-${i}`} />
            <button onClick={() => removeFrom(key, i)} className="text-red-600 hover:text-red-700 mt-2" data-testid={`remove-${key}-${i}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider">Title</Label>
          <Input data-testid="about-title" value={a.title || ""} onChange={(e)=>setA({...a, title: e.target.value})} className="rounded-sm mt-2" />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs uppercase tracking-wider">Body</Label>
          <Textarea data-testid="about-body" rows={6} value={a.body || ""} onChange={(e)=>setA({...a, body: e.target.value})} className="rounded-sm mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
        {listSection("objectives", "Objectives")}
        {listSection("attendees", "Who should attend")}
      </div>

      <div className="pt-4 border-t border-gray-200">
        {listSection("venue_items", "Venue & Visits")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="md:col-span-3">
          <Label className="text-xs uppercase tracking-wider">Organiser Body</Label>
          <Textarea data-testid="about-organizer" rows={3} value={a.organizer_body || ""} onChange={(e)=>setA({...a, organizer_body: e.target.value})} className="rounded-sm mt-2" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Contact Phone</Label>
          <Input data-testid="about-phone" value={a.contact_phone || ""} onChange={(e)=>setA({...a, contact_phone: e.target.value})} className="rounded-sm mt-2" />
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider">Contact Email</Label>
          <Input data-testid="about-email" value={a.contact_email || ""} onChange={(e)=>setA({...a, contact_email: e.target.value})} className="rounded-sm mt-2" />
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(a) !== JSON.stringify(content.about)} />
    </div>
  );
}

// ======================= CFP TAB =======================
function CfpTab({ content, onSave }) {
  const [c, setC] = useState(content.cfp || { sub_themes: [], publications: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => { setC(content.cfp || { sub_themes: [], publications: [] }); }, [content.cfp]);

  const updateList = (key, i, v) => { const arr = [...(c[key] || [])]; arr[i] = v; setC({...c, [key]: arr}); };
  const addTo = (key) => setC({ ...c, [key]: [...(c[key] || []), ""] });
  const removeFrom = (key, i) => setC({ ...c, [key]: (c[key] || []).filter((_, j) => j !== i) });

  const save = async () => {
    setSaving(true);
    try { await onSave({ cfp: c }); toast.success("CFP saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-xs uppercase tracking-wider">Title</Label>
        <Input data-testid="cfp-title" value={c.title || ""} onChange={(e)=>setC({...c, title: e.target.value})} className="rounded-sm mt-2" />
      </div>
      <div>
        <Label className="text-xs uppercase tracking-wider">Intro</Label>
        <Textarea data-testid="cfp-intro" rows={5} value={c.intro || ""} onChange={(e)=>setC({...c, intro: e.target.value})} className="rounded-sm mt-2" />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider">Sub-themes ({(c.sub_themes || []).length})</Label>
          <Button variant="ghost" size="sm" className="rounded-sm" onClick={() => addTo("sub_themes")} data-testid="add-sub-theme"><Plus size={12} className="mr-1" /> Add</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(c.sub_themes || []).map((v, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="font-mono text-[10px] text-gray-400 w-6">{String(i+1).padStart(2,"0")}</span>
              <Input value={v} onChange={(e)=>updateList("sub_themes", i, e.target.value)} className="rounded-sm flex-1" data-testid={`sub-theme-${i}`} />
              <button onClick={() => removeFrom("sub_themes", i)} className="text-red-600 hover:text-red-700" data-testid={`remove-sub-theme-${i}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-wider">Publications ({(c.publications || []).length})</Label>
          <Button variant="ghost" size="sm" className="rounded-sm" onClick={() => setC({ ...c, publications: [...(c.publications || []), { name: "", url: "", fee: "" }] })} data-testid="add-publication"><Plus size={12} className="mr-1" /> Add</Button>
        </div>
        <div className="space-y-3">
          {(c.publications || []).map((v, i) => {
            const obj = typeof v === "string" ? { name: v, url: "", fee: "" } : v;
            const updateField = (k, val) => {
              const n = [...(c.publications || [])];
              n[i] = { ...obj, [k]: val };
              setC({ ...c, publications: n });
            };
            return (
              <div key={i} data-testid={`publication-item-${i}`} className="border border-gray-300 bg-white p-3 space-y-2">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500">Journal Name</Label>
                  <Textarea rows={2} value={obj.name || ""} onChange={(e)=>updateField("name", e.target.value)} className="rounded-sm mt-1" data-testid={`publication-name-${i}`}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500">Website URL</Label>
                    <Input placeholder="https://..." value={obj.url || ""} onChange={(e)=>updateField("url", e.target.value)} className="rounded-sm mt-1" data-testid={`publication-url-${i}`}/>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500">Estimated Fee</Label>
                    <Input placeholder="IDR 500,000 / USD 50" value={obj.fee || ""} onChange={(e)=>updateField("fee", e.target.value)} className="rounded-sm mt-1" data-testid={`publication-fee-${i}`}/>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => removeFrom("publications", i)} className="text-xs text-red-600 hover:underline" data-testid={`remove-publication-${i}`}>Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(c) !== JSON.stringify(content.cfp)} />
    </div>
  );
}

// ======================= TEMPLATES TAB =======================
function TemplatesTab({ content, onSave }) {
  const [t, setT] = useState(content.templates || []);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setT(content.templates || []); }, [content.templates]);

  const update = (i, k, v) => { const n = [...t]; n[i] = { ...n[i], [k]: v }; setT(n); };
  const add = () => setT([...t, { name: "", language: "", filename: "", url: "" }]);
  const remove = (i) => setT(t.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try { await onSave({ templates: t }); toast.success("Templates saved"); }
    catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <div className="overline text-gray-500">— Templates ({t.length})</div>
      {t.map((tpl, i) => (
        <div key={i} data-testid={`template-item-${i}`} className="border border-gray-300 bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wider">Name</Label>
              <Input placeholder="E-JITU Template (English)" value={tpl.name || ""} onChange={(e)=>update(i, "name", e.target.value)} className="rounded-sm mt-2" data-testid={`template-name-${i}`} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Language</Label>
              <Input placeholder="English" value={tpl.language || ""} onChange={(e)=>update(i, "language", e.target.value)} className="rounded-sm mt-2" data-testid={`template-language-${i}`} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Filename</Label>
              <Input placeholder="Template.docx" value={tpl.filename || ""} onChange={(e)=>update(i, "filename", e.target.value)} className="rounded-sm mt-2" data-testid={`template-filename-${i}`} />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Download URL</Label>
              <Input placeholder="https://..." value={tpl.url || ""} onChange={(e)=>update(i, "url", e.target.value)} className="rounded-sm mt-2" data-testid={`template-url-${i}`} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => remove(i)} className="text-xs text-red-600 hover:underline" data-testid={`remove-template-${i}`}>Remove</button>
          </div>
        </div>
      ))}
      <Button data-testid="add-template-btn" variant="outline" className="rounded-sm" onClick={add}><Plus size={14} className="mr-2" /> Add Template</Button>
      <SaveBar onSave={save} saving={saving} dirty={JSON.stringify(t) !== JSON.stringify(content.templates)} />
    </div>
  );
}

// ======================= EMAIL TAB =======================
function EmailTab({ content, onSave }) {
  const [es, setEs] = useState(content.email_settings || {});
  const [newKey, setNewKey] = useState(""); // only sent when user types a new one
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  useEffect(() => { setEs(content.email_settings || {}); }, [content.email_settings]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { email_settings: {
        sender_email: es.sender_email || "",
        enabled: !!es.enabled,
        ...(newKey ? { resend_api_key: newKey } : {}),
      }};
      await onSave(payload);
      setNewKey("");
      toast.success("Email settings saved");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testTo) return toast.error("Enter a recipient email");
    setTesting(true);
    try {
      const payload = { to: testTo };
      // If user typed a new key but hasn't saved, include it in the test call
      if (newKey) payload.resend_api_key = newKey;
      if (es.sender_email) payload.sender_email = es.sender_email;
      const { data } = await api.post("/content/email/test", payload);
      toast.success(`Test sent to ${data.to} (id: ${data.id})`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      {/* How-to banner */}
      <div className="border border-blue-200 bg-blue-50 p-5 text-sm text-gray-800 leading-relaxed">
        <div className="overline text-[var(--brand)] mb-2">— How to get a Resend API key</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Go to <a className="underline text-[var(--brand)]" href="https://resend.com/signup" target="_blank" rel="noopener noreferrer">resend.com/signup</a> — you can sign up with your Gmail.</li>
          <li>After login, open <a className="underline text-[var(--brand)]" href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">Dashboard → API Keys → Create API Key</a>.</li>
          <li>Copy the key (starts with <span className="font-mono text-xs">re_</span>) and paste it below.</li>
          <li>Free tier allows sending from <span className="font-mono text-xs">onboarding@resend.dev</span>. To use your own address (e.g. <span className="font-mono text-xs">noreply@seaipc2026.imz.or.id</span>), add & verify your domain in Resend (SPF + DKIM DNS records).</li>
          <li>Click <strong>Save</strong>, then use <strong>Send Test Email</strong> to confirm.</li>
        </ol>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between border border-gray-300 p-4 bg-white">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2"><Mail size={14}/> Enable email sending</div>
          <div className="text-xs text-gray-500">If disabled, emails are mocked (logged only). Useful during testing.</div>
        </div>
        <Switch data-testid="email-enabled" checked={!!es.enabled} onCheckedChange={(v) => setEs({ ...es, enabled: v })} />
      </div>

      {/* API key */}
      <div>
        <Label className="text-xs uppercase tracking-wider">Resend API Key</Label>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              data-testid="email-api-key"
              type={showKey ? "text" : "password"}
              placeholder={es.resend_api_key_set ? `${es.resend_api_key_preview} (saved — leave blank to keep)` : "re_..."}
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="rounded-sm font-mono"
              autoComplete="off"
            />
          </div>
          <button type="button" onClick={() => setShowKey(!showKey)} className="p-2 border border-gray-300 rounded-sm hover:bg-gray-50" data-testid="toggle-show-key">
            {showKey ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
          {es.resend_api_key_set && !newKey && (
            <button type="button" onClick={() => { setEs({ ...es, _clear: true }); setNewKey(""); }} className="text-xs text-red-600 hover:underline" data-testid="clear-key-btn">Clear</button>
          )}
        </div>
        {es.resend_api_key_set && (
          <p className="text-xs text-green-700 mt-2 font-mono">✓ Key saved: {es.resend_api_key_preview}</p>
        )}
        {!es.resend_api_key_set && (
          <p className="text-xs text-amber-700 mt-2">No key saved yet. Emails are mocked (logged to server console).</p>
        )}
      </div>

      {/* Sender */}
      <div>
        <Label className="text-xs uppercase tracking-wider">Sender Email (From)</Label>
        <Input
          data-testid="email-sender"
          placeholder="onboarding@resend.dev"
          value={es.sender_email || ""}
          onChange={(e) => setEs({ ...es, sender_email: e.target.value })}
          className="rounded-sm mt-2 font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">Must be from a domain verified in your Resend account, or Resend's default <span className="font-mono">onboarding@resend.dev</span>.</p>
      </div>

      <SaveBar onSave={save} saving={saving} dirty={newKey !== "" || es.sender_email !== (content.email_settings?.sender_email || "") || es.enabled !== (content.email_settings?.enabled || false)} />

      {/* Test section */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="overline text-gray-500 mb-3">— Send Test Email</div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-wider">Recipient</Label>
            <Input
              data-testid="email-test-to"
              type="email"
              placeholder="your-email@gmail.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="rounded-sm mt-2"
            />
          </div>
          <Button data-testid="send-test-btn" onClick={sendTest} disabled={testing} className="rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white">
            <Send size={14} className="mr-2" /> {testing ? "Sending..." : "Send Test"}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Uses the key you just typed (if any), otherwise the saved key.</p>
      </div>
    </div>
  );
}

// ======================= MAIN =======================
export default function CMS() {
  const { content, save, refresh } = useContent();
  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <div className="overline text-[var(--brand)]">— Admin</div>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tighter font-bold mt-2">Site Content</h1>
        <p className="text-sm text-gray-600 mt-2">Edit every text, color, and image shown on the public site. Changes save instantly and are visible to visitors immediately.</p>
      </header>

      <Card className="rounded-sm border border-gray-200 shadow-none p-0 bg-white">
        <Tabs defaultValue="theme" className="w-full">
          <TabsList className="w-full justify-start border-b border-gray-200 rounded-none bg-transparent p-0 h-auto overflow-x-auto">
            <TabsTrigger value="theme" data-testid="cms-tab-theme" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Theme</TabsTrigger>
            <TabsTrigger value="branding" data-testid="cms-tab-branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Branding & Logo</TabsTrigger>
            <TabsTrigger value="flyer" data-testid="cms-tab-flyer" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Flyer</TabsTrigger>
            <TabsTrigger value="dates" data-testid="cms-tab-dates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Key Dates</TabsTrigger>
            <TabsTrigger value="about" data-testid="cms-tab-about" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">About</TabsTrigger>
            <TabsTrigger value="cfp" data-testid="cms-tab-cfp" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Call for Papers</TabsTrigger>
            <TabsTrigger value="templates" data-testid="cms-tab-templates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Templates</TabsTrigger>
            <TabsTrigger value="email" data-testid="cms-tab-email" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--brand)] data-[state=active]:text-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm">Email</TabsTrigger>
          </TabsList>
          <div className="p-6">
            <TabsContent value="theme"><ThemeTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="branding"><BrandingTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="flyer"><FlyerTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="dates"><DatesTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="about"><AboutTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="cfp"><CfpTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="templates"><TemplatesTab content={content} onSave={save} /></TabsContent>
            <TabsContent value="email"><EmailTab content={content} onSave={save} /></TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
