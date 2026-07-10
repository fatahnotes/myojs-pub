import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";
import { useContent } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Copy, Check, Building2, Mic } from "lucide-react";
import { useState } from "react";

// ==============================
// KEYNOTE & WELCOME SPEAKERS
// ==============================
const topSpeakers = [
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/WaryonoABDG.png",
    name: "Prof. Dr. H. Waryono Abdul Ghafur, S.Ag, M.Ag.",
    position: "Director of Zakat and Waqf Empowerment, Ministry of Religious Affairs of the Republic of Indonesia",
    confirmed: true,
  },
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/Fathuri.png",
    name: "Fatchuri Rosidin",
    position: "Director of IMZ",
    confirmed: true,
  },
];

// ==============================
// PLENARY SESSION 1
// ==============================
const plenary1Speakers = [
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/Asep-Saepuddin.png",
    name: "Prof. Asep Saepudin Jahar, M.A., Ph.D.",
    position: "Rector of Syarif Hidayatullah State Islamic University (UIN) Jakarta",
    confirmed: true,
  },
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/KammaruddinAmin.png",
    name: "Prof. Dr. Phil. H. Kamaruddin Amin, M.A.",
    position: "Chairman of the Indonesian Waqf Board (BWI)",
    confirmed: false,
  },
  {
    img: "https://images.unsplash.com/photo-1548449112-96a38b8daac4?w=300&h=300&fit=crop&crop=face",
    name: "Masagoes Muhammad Isyak",
    position: "CEO of Warees Investments, Singapore",
    confirmed: false,
  },
];

const plenary1Moderator = {
  name: "Moderator: Prima Hadi Putra, M.Com",
  role: "Director of Waqf Development and Investment Institute (LPIW), Dompet Dhuafa",
};

// ==============================
// PLENARY SESSION 2
// ==============================
const plenary2Speakers = [
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/Sodik-Mudjahid.png",
    name: "Dr. Ir. H. Sodik Mudjahid, M.Sc.",
    position: "Chairman of the National Board of Zakat (BAZNAS) RI",
    confirmed: false,
  },
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/Moch-Faizal-P.png",
    name: "Assoc. Prof. Dr. Mohd Faizal P. Rameli",
    position: "Head of Islamic Philanthropy & Social Finance (IPSF), UiTM Melaka, Malaysia",
    confirmed: true,
  },
  {
    img: "https://imz.or.id/wp-content/uploads/2026/05/Muchsin-Noor.png",
    name: "Dr. Muhsin Nor Paizin",
    position: "Academy of Zakat - Pusat Pungutan Zakat (AZKA-PPZ), Malaysia",
    confirmed: true,
  },
];

const plenary2Moderator = {
  name: "Moderator: Dr. Zunaidah Abu Hassan",
  role: "IPSF, UiTM Melaka",
};

// ==============================
// SPONSORS
// ==============================
const sponsors = [
  {
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop",
    name: "Islamic Development Bank (IsDB)",
  },
  {
    logo: "https://imz.or.id/wp-content/uploads/2026/05/DDu.png",
    name: "Dompet Dhuafa",
  },
  {
    logo: "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=200&h=200&fit=crop",
    name: "Warees Investments Pte Ltd",
  },
];

// ==============================
// Payment Info
// ==============================
const paymentInfo = {
  bank: "Bank Syariah Indonesia (BSI)",
  accountNumber: "7212502566",
  accountName: "Inspirasi Melintas Zaman",
  swiftCode: "BSMDIDJA",
};

export default function CallForPapers() {
  const { t } = useI18n();
  const { content } = useContent();
  const cfp = content.cfp || {};
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentInfo.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = paymentInfo.accountNumber;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasUnconfirmed = [...topSpeakers, ...plenary1Speakers, ...plenary2Speakers].some(
    (s) => !s.confirmed
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicHeader />

      <section className="max-w-6xl mx-auto px-6 md:px-12 py-16 lg:py-24">
        {/* Title & Intro */}
        <div className="overline text-[var(--brand)] mb-4">
          — {content.branding?.conf_short}
        </div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tighter font-bold mb-6">
          {cfp.title}
        </h1>
        <p className="text-base lg:text-lg text-gray-700 max-w-3xl leading-relaxed whitespace-pre-wrap">
          {cfp.intro}
        </p>

        {/* ==============================
            KEYNOTE & WELCOME SPEAKERS
        ============================== */}
        <div className="mt-16">
          <div className="overline text-gray-500 mb-8">— Keynote & Welcome Speakers</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {topSpeakers.map((speaker, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center"
                data-testid={`top-speaker-${idx}`}
              >
                <img
                  src={speaker.img}
                  alt={speaker.name}
                  className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 border-gray-200 shadow-md mb-4"
                />
                <p className="font-display text-lg font-semibold text-gray-900 leading-tight">
                  {speaker.name}
                  {!speaker.confirmed && (
                    <span className="text-gray-500 text-base ml-0.5">*</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-[240px]">
                  {speaker.position}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ==============================
            PLENARY SESSION 1
        ============================== */}
        <div className="mt-16">
          <div className="overline text-gray-500 mb-2">— Plenary Session 1</div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-gray-900 mb-8 max-w-3xl">
            Strategic Waqf Governance for Inclusive Economic Growth in ASEAN
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {plenary1Speakers.map((speaker, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center"
                data-testid={`plenary1-speaker-${idx}`}
              >
                <img
                  src={speaker.img}
                  alt={speaker.name}
                  className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 border-gray-200 shadow-md mb-4"
                />
                <p className="font-display text-base md:text-lg font-semibold text-gray-900 leading-tight">
                  {speaker.name}
                  {!speaker.confirmed && (
                    <span className="text-gray-500 text-base ml-0.5">*</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-[240px]">
                  {speaker.position}
                </p>
              </div>
            ))}
          </div>

          {/* Moderator Card */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-blue-50/80 border border-blue-100 rounded-full px-5 py-2.5 shadow-sm">
              <Mic size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{plenary1Moderator.name}</span>
                <span className="text-gray-500"> – {plenary1Moderator.role}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ==============================
            PLENARY SESSION 2
        ============================== */}
        <div className="mt-16">
          <div className="overline text-gray-500 mb-2">— Plenary Session 2</div>
          <h3 className="font-display text-xl md:text-2xl font-bold text-gray-900 mb-8 max-w-3xl">
            Harmonization of Zakat Policy and Islamic Philanthropy with ASEAN Financial System
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {plenary2Speakers.map((speaker, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center"
                data-testid={`plenary2-speaker-${idx}`}
              >
                <img
                  src={speaker.img}
                  alt={speaker.name}
                  className="w-32 h-32 md:w-36 md:h-36 rounded-full object-cover border-2 border-gray-200 shadow-md mb-4"
                />
                <p className="font-display text-base md:text-lg font-semibold text-gray-900 leading-tight">
                  {speaker.name}
                  {!speaker.confirmed && (
                    <span className="text-gray-500 text-base ml-0.5">*</span>
                  )}
                </p>
                <p className="text-sm text-gray-600 mt-1 max-w-[240px]">
                  {speaker.position}
                </p>
              </div>
            ))}
          </div>

          {/* Moderator Card */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-3 bg-blue-50/80 border border-blue-100 rounded-full px-5 py-2.5 shadow-sm">
              <Mic size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{plenary2Moderator.name}</span>
                <span className="text-gray-500"> – {plenary2Moderator.role}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Keterangan to be confirmed */}
        {hasUnconfirmed && (
          <p className="text-xs text-gray-400 italic mt-8 text-center">
            * To be confirmed
          </p>
        )}

        {/* ============================================
            PAYMENT SECTION
        ============================================ */}
        <div
          data-testid="payment-section"
          className="mt-14 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-4 md:px-8 md:py-5">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Building2 size={20} className="text-gray-700" />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-mono uppercase tracking-wider">
                  Payment via
                </div>
                <div className="font-display text-base md:text-lg font-bold text-gray-900">
                  {paymentInfo.bank}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-400 text-xs font-mono mb-0.5">
                  Account Number
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-gray-900 tracking-wider">
                    {paymentInfo.accountNumber}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                    title="Copy account number"
                  >
                    {copied ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs font-mono mb-0.5">
                  Account Holder
                </div>
                <div className="text-base font-semibold text-gray-900">
                  {paymentInfo.accountName}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs font-mono mb-0.5">
                  Swift Code
                </div>
                <div className="font-mono text-base font-bold text-gray-900 tracking-wider">
                  {paymentInfo.swiftCode}
                </div>
              </div>
            </div>
          </div>

          {copied && (
            <div className="bg-green-50 border-t border-green-100 text-green-700 text-center text-sm py-2 font-medium">
              Account number copied successfully!
            </div>
          )}
        </div>

        {/* Sub-themes */}
        {cfp.sub_themes?.length > 0 && (
          <div className="mt-14">
            <div className="overline text-gray-500 mb-4">
              — Sub-themes · {cfp.sub_themes.length} Tracks
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-gray-300">
              {cfp.sub_themes.map((s, i) => (
                <div
                  key={i}
                  data-testid={`cfp-theme-${i}`}
                  className="border-r border-b border-gray-300 p-4 bg-white hover:bg-[var(--brand)] hover:text-white transition-base group cursor-default"
                >
                  <span className="font-mono text-[10px] text-[var(--brand)] group-hover:text-white block mb-1 opacity-80">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-medium">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publications */}
        {cfp.publications?.length > 0 && (
          <div className="mt-16 bg-gray-900 text-white p-8 md:p-12">
            <div className="overline text-blue-300 mb-4">
              — Publication Opportunities
            </div>
            <h2 className="font-display text-2xl lg:text-4xl tracking-tight font-bold mb-8 max-w-2xl">
              Selected accepted papers will be offered for publication in:
            </h2>
            <ul className="space-y-5 max-w-3xl">
              {cfp.publications.map((p, i) => {
                const obj = typeof p === "string" ? { name: p, url: "", fee: "" } : p;
                return (
                  <li key={i} className="flex gap-4 border-t border-gray-700 pt-4">
                    <BookOpen size={18} className="text-blue-300 mt-1 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm lg:text-base text-gray-200 leading-relaxed">
                        {obj.name}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono">
                        {obj.url && (
                          <a
                            href={obj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:underline"
                          >
                            Visit journal →
                          </a>
                        )}
                        {obj.fee && (
                          <span className="text-gray-400">
                            Est. fee:{" "}
                            <span className="text-gray-100 font-semibold">
                              {obj.fee}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ==============================
            SPONSORS
        ============================== */}
        <div className="mt-16">
          <div className="overline text-gray-500 mb-8">— Our Sponsors</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sponsors.map((sponsor, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center"
                data-testid={`sponsor-${idx}`}
              >
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="w-32 h-32 md:w-36 md:h-36 object-contain bg-white border border-gray-200 rounded-md shadow-sm p-3 mb-4"
                />
                <p className="font-display text-sm font-semibold text-gray-900 leading-tight">
                  {sponsor.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-16 border-t border-gray-300 pt-10 flex flex-wrap gap-4 items-center">
          <Link to="/register">
            <Button
              data-testid="cfp-submit-cta"
              className="rounded-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white px-6 py-6 text-sm tracking-wide"
            >
              {t("hero_cta_submit")} <ArrowRight size={14} className="ml-2" />
            </Button>
          </Link>
          <Link to="/templates">
            <Button
              data-testid="cfp-templates-cta"
              variant="outline"
              className="rounded-sm border-gray-900 px-6 py-6 text-sm tracking-wide"
            >
              {t("templates_title")}
            </Button>
          </Link>
          <Link to="/dates">
            <Button
              data-testid="cfp-dates-cta"
              variant="ghost"
              className="rounded-sm px-6 py-6 text-sm tracking-wide"
            >
              {t("dates_title")}
            </Button>
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}