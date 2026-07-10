import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { useContent } from "@/lib/content";
import { User } from "lucide-react";

const ABSTRACT_IMG = "https://imz.or.id/wp-content/uploads/2026/05/ABOUT-SEAIPC.jpg.jpeg";

// ==============================
// ORGANIZING COMMITTEE
// ==============================
const committeeMembers = [
  { name: "Prof. Dr. Muhammad Maksum, S.H., M.A., M.D.C.", institution: "UIN Jakarta" },
  { name: "Dr. Afwan Faizin, M.A.", institution: "UIN Jakarta" },
  { name: "Dr. Masyrofah, S.Ag., M.Si.", institution: "UIN Jakarta" },
  { name: "Dr. Windy Triana, M.A.", institution: "UIN Jakarta" },
  { name: "Assoc. Prof. Dr. Mohd Faizal P. Rameli", institution: "UiTM" },
  { name: "Dr. Syahrina Hayati MD Jani", institution: "UiTM" },
  { name: "Dr. Syahbudin Senin", institution: "UiTM" },
  { name: "Dr. Siti Mariam Ali", institution: "UiTM" },
  { name: "Fatchuri Rosyidin, S.Psi.", institution: "IMZ" },
  { name: "Prasetyo Wibowo, S.Kom., MEK.", institution: "IMZ" },
  { name: "Rini Yaumi Habibah", institution: "IMZ" },
  { name: "Naluri Hardiansyah", institution: "IMZ" },
  { name: "Agung Nugroho", institution: "IMZ" },
  { name: "Sumayya Syahidah", institution: "IMZ" },
  { name: "Intan Liana", institution: "IMZ" },
];

// Fungsi untuk mengambil inisial dari nama
const getInitials = (fullName) => {
  return fullName
    .split(" ")
    .filter((word) => !["Prof.", "Dr.", "Assoc.", "H.", "S.Psi.", "S.Kom.,", "M.A.", "M.D.C.", "S.Ag.,", "M.Si.", "S.H.,", "M.A.,", "MEK."].includes(word))
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function About() {
  const { content } = useContent();
  const a = content.about || {};

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <PublicHeader />

      <section className="max-w-5xl mx-auto px-6 md:px-12 py-16 lg:py-24">
        <div className="overline text-[var(--brand)] mb-4">— About</div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tighter font-bold mb-8">
          {a.title}
        </h1>
        <img
          src={ABSTRACT_IMG}
          alt="Philanthropy"
          className="w-full h-72 object-cover border border-gray-300 mb-10"
        />
        <p className="text-gray-700 leading-relaxed text-base lg:text-lg max-w-3xl whitespace-pre-wrap">
          {a.body}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">
          {a.objectives?.length > 0 && (
            <div className="border border-gray-300 bg-white p-6">
              <div className="overline text-gray-500 mb-3">— Conference Objectives</div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                {a.objectives.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ol>
            </div>
          )}
          {a.attendees?.length > 0 && (
            <div className="border border-gray-300 bg-white p-6">
              <div className="overline text-gray-500 mb-3">— Who should attend</div>
              <ul className="space-y-2 text-sm text-gray-700">
                {a.attendees.map((o, i) => (
                  <li key={i}>· {o}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        

        {/* ==============================
            ORGANIZING COMMITTEE (elegan)
        ============================== */}
        <div className="mt-16">
          <div className="overline text-gray-500 mb-8">— Organizing Committee</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {committeeMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-shadow duration-200 group"
                data-testid={`committee-member-${idx}`}
              >
                {/* Inisial dalam lingkaran berwarna */}
                <div className="w-14 h-14 rounded-full bg-[var(--brand)] text-white flex items-center justify-center mb-3 font-display text-xl font-bold tracking-tight shadow-sm">
                  {getInitials(member.name)}
                </div>
                <p className="font-display text-sm font-semibold text-gray-900 leading-snug group-hover:text-[var(--brand)] transition-colors">
                  {member.name}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium tracking-wide uppercase">
                  {member.institution}
                </p>
              </div>
            ))}
          </div>
        </div>

        {a.venue_items?.length > 0 && (
          <div className="mt-14 border-t border-gray-300 pt-10">
            <div className="overline text-gray-500 mb-3">— Venue & Visits</div>
            <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
              {a.venue_items.map((v, i) => (
                <li key={i}>· {v}</li>
              ))}
            </ul>
          </div>
        )}

        {(a.organizer_body || a.contact_phone || a.contact_email) && (
          <div className="mt-14 border border-gray-300 bg-gray-900 text-white p-8">
            <div className="overline text-blue-300 mb-3">— Organiser</div>
            {a.organizer_body && (
              <p className="text-sm text-gray-300 max-w-2xl">{a.organizer_body}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-6 text-xs font-mono">
              {a.contact_phone && <span>{a.contact_phone}</span>}
              {a.contact_email && <span>{a.contact_email}</span>}
            </div>
          </div>
        )}
      </section>

      <PublicFooter />
    </div>
  );
}