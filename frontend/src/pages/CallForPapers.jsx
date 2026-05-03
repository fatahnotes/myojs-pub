import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useContent } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

export default function CallForPapers() {
  const { t } = useI18n();
  const { content } = useContent();
  const cfp = content.cfp || {};
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicHeader />
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-16 lg:py-24">
        <div className="overline text-[var(--brand)] mb-4">— {content.branding?.conf_short}</div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tighter font-bold mb-6">{cfp.title}</h1>
        <p className="text-base lg:text-lg text-gray-700 max-w-3xl leading-relaxed whitespace-pre-wrap">{cfp.intro}</p>

        {cfp.sub_themes?.length > 0 && (
          <div className="mt-14">
            <div className="overline text-gray-500 mb-4">— Sub-themes · {cfp.sub_themes.length} Tracks</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-gray-300">
              {cfp.sub_themes.map((s, i) => (
                <div
                  key={i}
                  data-testid={`cfp-theme-${i}`}
                  className="border-r border-b border-gray-300 p-4 bg-white hover:bg-[var(--brand)] hover:text-white transition-base group cursor-default"
                >
                  <span className="font-mono text-[10px] text-[var(--brand)] group-hover:text-white block mb-1 opacity-80">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cfp.publications?.length > 0 && (
          <div className="mt-16 bg-gray-900 text-white p-8 md:p-12">
            <div className="overline text-blue-300 mb-4">— Publication Opportunities</div>
            <h2 className="font-display text-2xl lg:text-4xl tracking-tight font-bold mb-8 max-w-2xl">Selected accepted papers will be offered for publication in:</h2>
            <ul className="space-y-5 max-w-3xl">
              {cfp.publications.map((p, i) => {
                const obj = typeof p === "string" ? { name: p, url: "", fee: "" } : p;
                return (
                  <li key={i} className="flex gap-4 border-t border-gray-700 pt-4">
                    <BookOpen size={18} className="text-blue-300 mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm lg:text-base text-gray-200 leading-relaxed">{obj.name}</div>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono">
                        {obj.url && <a href={obj.url} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">Visit journal →</a>}
                        {obj.fee && <span className="text-gray-400">Est. fee: <span className="text-gray-100 font-semibold">{obj.fee}</span></span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-16 border-t border-gray-300 pt-10 flex flex-wrap gap-4 items-center">
          <Link to="/register"><Button data-testid="cfp-submit-cta" className="rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-6 text-sm tracking-wide">{t("hero_cta_submit")} <ArrowRight size={14} className="ml-2"/></Button></Link>
          <Link to="/templates"><Button data-testid="cfp-templates-cta" variant="outline" className="rounded-sm border-gray-900 px-6 py-6 text-sm tracking-wide">{t("templates_title")}</Button></Link>
          <Link to="/dates"><Button data-testid="cfp-dates-cta" variant="ghost" className="rounded-sm px-6 py-6 text-sm tracking-wide">{t("dates_title")}</Button></Link>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
