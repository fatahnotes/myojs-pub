import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ExternalLink, FileText } from "lucide-react";

const STATUS_STYLES = {
  pending:    "bg-amber-50 text-amber-900 border-amber-300",
  submitted:  "bg-blue-50 text-blue-900 border-blue-300",
  accepted:   "bg-emerald-50 text-emerald-900 border-emerald-300",
  rejected:   "bg-red-50 text-red-900 border-red-300",
  completed:  "bg-emerald-600 text-white border-emerald-700",
};

export default function JournalRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/journal-requests");
      setItems(r.data);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/journal-requests/${id}`, { status });
      toast.success("Status updated");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="overline text-[var(--brand)]">— Post-Publish Pipeline</div>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tighter font-bold mt-2">Journal Publication Requests</h1>
        <p className="text-sm text-gray-600 mt-2">Authors of published papers can request continuation to partner journals. Track each request here.</p>
      </header>

      <Card className="rounded-sm border border-gray-200 shadow-none p-0 overflow-hidden bg-white">
        <Table data-testid="journal-requests-table">
          <TableHeader>
            <TableRow className="bg-gray-50 border-b border-gray-200">
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Paper</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Author</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Target Journal</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Est. Fee</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Date</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wider">Status</TableHead>
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Loading…</TableCell></TableRow>}
            {!loading && items.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-14 text-gray-400" data-testid="journal-requests-empty">
                No journal publication requests yet.
              </TableCell></TableRow>
            )}
            {items.map((r) => (
              <TableRow key={r.id} data-testid={`journal-request-row-${r.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                <TableCell>
                  <Link to={`/dashboard/papers/${r.paper_id}`} className="font-medium hover:text-[var(--brand)]">{r.paper_title}</Link>
                  {r.note && <div className="text-xs text-gray-500 mt-1 italic">"{r.note}"</div>}
                </TableCell>
                <TableCell className="text-sm text-gray-600">{r.author_name}</TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{r.journal_name}</div>
                  {r.journal_url && (
                    <a href={r.journal_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--brand)] hover:underline inline-flex items-center gap-1 mt-1">
                      <ExternalLink size={10}/> {r.journal_url.replace(/^https?:\/\//, "").slice(0, 40)}
                    </a>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono">{r.journal_fee || "—"}</TableCell>
                <TableCell className="text-xs font-mono text-gray-500">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <span className={`inline-block rounded-sm font-mono text-[10px] tracking-wider uppercase border px-2 py-0.5 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>{r.status}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <SelectTrigger data-testid={`status-select-${r.id}`} className="rounded-sm w-36 h-8 text-xs ml-auto"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
