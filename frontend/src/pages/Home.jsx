import { Link } from "react-router-dom";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { useI18n } from "@/i18n";
import { useContent } from "@/lib/content";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Download } from "lucide-react";

const HERO_IMG = "https://imz.or.id/wp-content/uploads/2026/05/WAQF-FOR-THE-FUTURE.jpg.jpeg";
const RESEARCHER_IMG = "https://imz.or.id/wp-content/uploads/2026/05/FOR-ACADEMICIANS-RESEARCHERS-INDUSTRY-AND-CIVIL-SOCIETY.jpg.jpeg";

function resolveUrl(u) {
  if (!u) return "";
  if (u.startsWith("http")) return u;
  if (u.startsWith("/api")) return `${process.env.REACT_APP_BACKEND_URL}${u}`;
  return u;
}

export default function Home() {
  const { t } = useI18n();
  const { content } = useContent();
  const b = content.branding || {};
  const flyer = content.flyer || {};
  const dates = content.dates || [];

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicHeader />

      {/* HERO */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="overline text-[var(--brand)] mb-4">{b.hero_overline}</div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl tracking-tighter leading-[0.95] font-bold text-gray-900">
              {b.hero_title}
            </h1>
            {b.hero_title2 && (
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tighter leading-tight font-medium text-gray-700 mt-4 max-w-2xl">
                {b.hero_title2}
              </h2>
            )}
            <p className="mt-6 text-base lg:text-lg text-gray-600 max-w-xl leading-relaxed">{b.hero_subtitle}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/register">
                <Button data-testid="hero-submit-btn" className="rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-6 text-sm tracking-wide">
                  {t("hero_cta_submit")} <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
              <Link to="/call-for-papers">
                <Button data-testid="hero-cfp-btn" variant="outline" className="rounded-sm border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white px-6 py-6 text-sm tracking-wide">
                  {t("hero_cta_cfp")}
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="mt-14 grid grid-cols-3 border-t border-gray-300 pt-8 gap-4">
              <div>
                <div className="overline text-gray-500">Edition</div>
                <div className="font-display text-2xl font-bold mt-1">{b.stat_edition}</div>
              </div>
              <div>
                <div className="overline text-gray-500">Tracks</div>
                <div className="font-display text-2xl font-bold mt-1">{b.stat_tracks}</div>
              </div>
              <div>
                <div className="overline text-gray-500">Journals</div>
                <div className="font-display text-2xl font-bold mt-1">{b.stat_journals}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-gray-300 overflow-hidden">
              <img src={HERO_IMG} alt="SEAIPC" className="w-full h-[440px] object-cover" />
              <div className="p-5 bg-white border-t border-gray-300">
                <div className="overline text-gray-500">Host City</div>
                <p className="mt-2 font-display text-xl font-bold">{b.conf_location}</p>
                <p className="mt-1 text-sm text-gray-600">{b.conf_date}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLYER SECTION (above Important Dates) */}
      {flyer.enabled && flyer.image_url && (
        <section data-testid="flyer-section" className="border-t border-gray-200 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="overline text-[var(--brand)] mb-3">— Featured</div>
              <h2 className="font-display text-3xl lg:text-5xl tracking-tighter font-bold leading-tight">{flyer.title}</h2>
              {flyer.caption && <p className="mt-5 text-sm lg:text-base text-gray-600 max-w-md leading-relaxed">{flyer.caption}</p>}
              {(flyer.download_url || flyer.image_url) && (
                <a
                  data-testid="flyer-download-btn"
                  href={resolveUrl(flyer.download_url || flyer.image_url)}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-8 rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-3 text-sm tracking-wide transition-base"
                >
                  <Download size={14} /> Download Flyer
                </a>
              )}
            </div>
            <div className="lg:col-span-7">
              <div className="border border-gray-300 bg-white overflow-hidden">
                <img
                  data-testid="flyer-image"
                  src={resolveUrl(flyer.image_url)}
                  alt={flyer.title}
                  className="w-full max-h-[620px] object-contain bg-white"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KEY DATES STRIP */}
      {dates.length > 0 && (
        <section className="border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="overline text-[var(--brand)] mb-2">— Calendar</div>
                <h2 className="font-display text-3xl lg:text-4xl tracking-tight font-bold">{t("dates_title")}</h2>
              </div>
              <Link to="/dates" className="hidden md:inline-flex items-center text-sm text-[var(--brand)] hover:underline">View all dates <ArrowRight size={14} className="ml-1"/></Link>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-${Math.min(dates.length, 6)} border-t border-gray-300`}>
              {dates.slice(0, 6).map((row, i, arr) => (
                <div key={i} className={`p-5 border-b border-gray-300 ${i < arr.length - 1 ? "lg:border-r" : ""}`}>
                  <CalendarDays size={14} className="text-[var(--brand)] mb-3" />
                  <div className="overline text-gray-500">{row.label}</div>
                  <div className="font-mono text-sm font-semibold mt-2">{row.date}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROCESS */}
      <section className="border-t border-gray-200 bg-[#F9FAFB]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="overline text-gray-500 mb-3">— Submission</div>
            <h2 className="font-display text-3xl lg:text-4xl tracking-tight font-bold">How the editorial workflow works.</h2>
            <p className="text-sm text-gray-600 mt-4 max-w-md">From your first submission through double-blind peer review to final publication with DOI assignment and e-ISBN proceedings.</p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { n: "01", t: "Register", d: "Create an author account." },
              { n: "02", t: "Submit", d: "Upload manuscript (PDF/DOCX)." },
              { n: "03", t: "Review", d: "Editors assign double-blind reviewers." },
              { n: "04", t: "Decide", d: "Accept, revise, or reject with DOI." },
            ].map((s) => (
              <div key={s.n} className="bg-white border border-gray-300 p-6 hover:-translate-y-0.5 hover:shadow-sm transition-base">
                <div className="font-mono text-xs text-[var(--brand)] mb-2">{s.n}</div>
                <h3 className="font-display text-xl font-bold">{s.t}</h3>
                <p className="text-sm text-gray-600 mt-2">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="overline text-blue-300 mb-3">— Who should attend</div>
            <h2 className="font-display text-3xl lg:text-5xl tracking-tighter font-bold leading-tight">For academicians, researchers, industry, and civil society.</h2>
            <p className="mt-5 text-gray-300 max-w-xl">A forum for Islamic microfinance and philanthropy, sustainable development, and the mainstream economy.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register"><Button data-testid="cta-register" className="rounded-sm bg-white text-gray-900 hover:bg-blue-100 px-6 py-6 text-sm tracking-wide">{t("nav_register")}</Button></Link>
              <Link to="/templates"><Button data-testid="cta-templates" variant="outline" className="rounded-sm border-white text-white bg-transparent hover:bg-white hover:text-gray-900 px-6 py-6 text-sm tracking-wide">{t("templates_title")}</Button></Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <img src={RESEARCHER_IMG} alt="Researcher" className="w-full h-[360px] object-cover border border-gray-700" />
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
