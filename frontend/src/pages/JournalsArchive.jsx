import { useEffect, useState } from "react";
import { api, API } from "@/lib/api";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const LIB_IMG = "https://images.unsplash.com/photo-1756037020659-6f9d3418f6b6?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

export default function JournalsArchive() {
  const { t } = useI18n();
  const [papers, setPapers] = useState([]);
  useEffect(() => { api.get("/papers/published").then(r => setPapers(r.data)).catch(()=>{}); }, []);
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicHeader />
      <div className="relative border-b border-gray-200">
        <img src={LIB_IMG} alt="Library" className="w-full h-72 object-cover"/>
        <div className="absolute inset-0 bg-black/50 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-6 md:px-12 lg:px-24 pb-10">
            <div className="overline text-blue-200 mb-3">— Proceedings · {t("conf_short")}</div>
            <h1 className="font-display text-4xl lg:text-6xl tracking-tighter font-bold text-white">{t("nav_archive")}</h1>
            <p className="text-sm text-gray-200 mt-3 max-w-2xl">Published papers and accepted proceedings from the {t("conf_full")}.</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        {papers.length === 0 && (
          <div className="text-center py-20 border border-dashed border-gray-300" data-testid="archive-empty">
            <div className="overline text-gray-500">— No Published Papers Yet</div>
            <p className="text-sm text-gray-500 mt-3">Published papers will appear here once finalized.</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {papers.map((p) => (
            <article key={p.id} data-testid={`archive-paper-${p.id}`} className="border-t border-gray-300 pt-6 hover:border-[var(--brand)] transition-base">
              <div className="overline text-[var(--brand)] mb-2">— {new Date(p.updated_at).getFullYear()}{p.doi && <span className="ml-2 text-gray-500">· DOI {p.doi}</span>}</div>
              <h2 className="font-display text-2xl lg:text-3xl tracking-tight font-bold">{p.title}</h2>
              <p className="text-sm text-gray-600 mt-2">by {p.author_name}{p.co_authors?.length ? ` · ${p.co_authors.join(", ")}`: ""}</p>
              <p className="text-sm text-gray-700 mt-3 line-clamp-4">{p.abstract}</p>
              {p.keywords?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.keywords.map((k) => <span key={k} className="text-[11px] font-mono uppercase tracking-wider border border-gray-300 px-2 py-0.5">{k}</span>)}
                </div>
              )}
              {(p.final_file_id || p.file_id) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    data-testid={`archive-view-${p.id}`}
                    href={`${API}/public/paper/${p.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide border border-gray-900 px-4 py-2 hover:bg-gray-900 hover:text-white transition-base"
                  >
                    <FileText size={12}/> View PDF
                  </a>
                  <a
                    data-testid={`archive-download-${p.id}`}
                    href={`${API}/public/paper/${p.id}/pdf`}
                    download={`${p.title.replace(/[^a-zA-Z0-9]+/g,'_')}.pdf`}
                    className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-4 py-2 transition-base"
                  >
                    <Download size={12}/> Download
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
