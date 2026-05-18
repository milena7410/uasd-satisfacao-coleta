import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Heart, FileDown, Trash2, ThumbsUp, ThumbsDown, Users, ArrowLeft, RefreshCw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, startOfDay, startOfWeek, startOfMonth, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Response = {
  id: string;
  first_name: string;
  rating: "gostei" | "nao_gostei";
  created_at: string;
};

type Filter = "all" | "day" | "week" | "month";

const UNIT_NAME = "UBSF Mata do Jacinto";

function AdminPage() {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("Erro ao carregar"); return; }
    setResponses((data ?? []) as Response[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return responses;
    const now = new Date();
    const cutoff =
      filter === "day" ? startOfDay(now) :
      filter === "week" ? startOfWeek(now, { weekStartsOn: 1 }) :
      startOfMonth(now);
    return responses.filter((r) => isAfter(new Date(r.created_at), cutoff));
  }, [responses, filter]);

  const stats = useMemo(() => {
    const liked = filtered.filter((r) => r.rating === "gostei").length;
    const disliked = filtered.filter((r) => r.rating === "nao_gostei").length;
    const total = filtered.length;
    const satisfaction = total ? Math.round((liked / total) * 100) : 0;
    return { liked, disliked, total, satisfaction };
  }, [filtered]);

  const pieData = [
    { name: "Gostei", value: stats.liked, color: "oklch(0.7 0.16 155)" },
    { name: "Não gostei", value: stats.disliked, color: "oklch(0.7 0.18 30)" },
  ];

  const byDayData = useMemo(() => {
    const map = new Map<string, { day: string; gostei: number; nao_gostei: number }>();
    filtered.forEach((r) => {
      const key = format(new Date(r.created_at), "dd/MM");
      const entry = map.get(key) ?? { day: key, gostei: 0, nao_gostei: 0 };
      entry[r.rating]++;
      map.set(key, entry);
    });
    return Array.from(map.values()).reverse().slice(-14);
  }, [filtered]);

  const clearAll = async () => {
    const { error } = await supabase.from("survey_responses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("Erro ao limpar"); return; }
    toast.success("Banco de dados limpo!");
    load();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const periodLabel: Record<Filter, string> = {
      all: "Todos os registros", day: "Hoje", week: "Esta semana", month: "Este mês",
    };

    // Header bar
    doc.setFillColor(34, 139, 138);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(UNIT_NAME, 14, 14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Pesquisa de Satisfação", 14, 22);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel[filter]}`, 14, 40);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 46);

    // Stats boxes
    doc.setFillColor(232, 250, 245);
    doc.roundedRect(14, 54, 55, 28, 3, 3, "F");
    doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text("TOTAL", 18, 62);
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(34, 139, 138);
    doc.text(String(stats.total), 18, 76);

    doc.setFillColor(232, 250, 235);
    doc.roundedRect(78, 54, 55, 28, 3, 3, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text("GOSTARAM", 82, 62);
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 160, 90);
    doc.text(String(stats.liked), 82, 76);

    doc.setFillColor(252, 235, 232);
    doc.roundedRect(142, 54, 55, 28, 3, 3, "F");
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text("NÃO GOSTARAM", 146, 62);
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 80, 60);
    doc.text(String(stats.disliked), 146, 76);

    // Satisfaction
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
    doc.text(`Índice de Satisfação: ${stats.satisfaction}%`, 14, 96);

    autoTable(doc, {
      startY: 104,
      head: [["Nome", "Avaliação", "Data/Hora"]],
      body: filtered.map((r) => [
        r.first_name,
        r.rating === "gostei" ? "Gostei" : "Não gostei",
        format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      ]),
      headStyles: { fillColor: [34, 139, 138], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 250, 250] },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    doc.save(`pesquisa-satisfacao-${UNIT_NAME.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF gerado!");
  };

  return (
    <main className="relative min-h-screen bg-background pb-16">
      <div className="pointer-events-none absolute top-0 left-0 h-96 w-full bg-gradient-hero opacity-10" />

      <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-11 w-11 place-items-center rounded-2xl bg-card shadow-soft transition hover:scale-105">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-hero shadow-glow">
              <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-foreground md:text-2xl">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">{UNIT_NAME}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </button>
          <button onClick={generatePDF} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-105 disabled:opacity-50">
            <FileDown className="h-4 w-4" /> Gerar PDF
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-card px-4 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Limpar
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todos os registros?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação apagará permanentemente todas as {responses.length} respostas. Não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll} className="bg-destructive hover:bg-destructive/90">
                  Sim, limpar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-card p-2 shadow-soft">
          {([
            ["all", "Todos"], ["day", "Hoje"], ["week", "Esta semana"], ["month", "Este mês"],
          ] as [Filter, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition md:text-base ${
                filter === k ? "bg-gradient-hero text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Total" value={stats.total} tone="primary" />
          <StatCard icon={<ThumbsUp className="h-5 w-5" />} label="Gostaram" value={stats.liked} tone="success" />
          <StatCard icon={<ThumbsDown className="h-5 w-5" />} label="Não gostaram" value={stats.disliked} tone="warm" />
          <StatCard icon={<Heart className="h-5 w-5" />} label="Satisfação" value={`${stats.satisfaction}%`} tone="primary" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-3xl bg-card p-6 shadow-card lg:col-span-2">
            <h3 className="mb-4 font-display text-lg font-bold">Distribuição</h3>
            {stats.total === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-card lg:col-span-3">
            <h3 className="mb-4 font-display text-lg font-bold">Respostas por dia</h3>
            {byDayData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byDayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 190)" />
                  <XAxis dataKey="day" stroke="oklch(0.5 0.03 200)" fontSize={12} />
                  <YAxis stroke="oklch(0.5 0.03 200)" fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="gostei" name="Gostei" fill="oklch(0.7 0.16 155)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="nao_gostei" name="Não gostei" fill="oklch(0.7 0.18 30)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent list */}
        <div className="mt-6 rounded-3xl bg-card p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-bold">Respostas recentes</h3>
          <div className="max-h-96 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">Nenhuma resposta no período selecionado.</p>
            ) : (
              <ul className="space-y-2">
                {filtered.slice(0, 50).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl ${r.rating === "gostei" ? "bg-gradient-success" : "bg-gradient-warm"} text-primary-foreground`}>
                        {r.rating === "gostei" ? <ThumbsUp className="h-5 w-5" /> : <ThumbsDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{r.first_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.rating === "gostei" ? "Gostei" : "Não gostei"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "primary" | "success" | "warm" }) {
  const toneClass =
    tone === "success" ? "bg-gradient-success" :
    tone === "warm" ? "bg-gradient-warm" : "bg-gradient-hero";
  return (
    <div className="rounded-3xl bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass} text-primary-foreground shadow-soft`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 font-display text-4xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-[280px] place-items-center text-center text-muted-foreground">
      <div>
        <p className="text-3xl">📊</p>
        <p className="mt-2 text-sm">Sem dados ainda</p>
      </div>
    </div>
  );
}
