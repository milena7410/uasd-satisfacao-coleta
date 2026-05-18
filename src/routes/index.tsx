import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Heart, ThumbsUp, ThumbsDown, Sparkles, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  component: SurveyPage,
});

type Step = "name" | "rating" | "done";

function SurveyPage() {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNameNext = (rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) {
      toast.error("Por favor, digite seu nome");
      return;
    }
    if (trimmed.length > 50) {
      toast.error("Nome muito longo");
      return;
    }
    setName(trimmed);
    setStep("rating");
  };

  const handleRate = async (rating: "gostei" | "nao_gostei") => {
    setSubmitting(true);
    const { error } = await supabase
      .from("survey_responses")
      .insert({ first_name: name.trim(), rating });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
      return;
    }
    setStep("done");
    setTimeout(() => {
      setStep("name");
      setName("");
    }, 4000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 md:py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-hero shadow-glow">
            <Heart className="h-6 w-6 text-primary-foreground" fill="currentColor" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">UBSF</p>
            <p className="font-display text-lg font-bold text-foreground">Mata do Jacinto</p>
          </div>
        </div>
        <Link
          to="/admin"
          className="rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur transition hover:text-foreground"
        >
          Admin
        </Link>
      </header>

      {/* Content */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl items-center justify-center px-6 pb-16 md:px-12">
        {step === "name" && <NameStep name={name} onNext={handleNameNext} />}
        {step === "rating" && <RatingStep name={name} onRate={handleRate} submitting={submitting} />}
        {step === "done" && <DoneStep name={name} />}
      </section>
    </main>
  );
}

function NameStep({ name, onNext }: { name: string; onNext: (value: string) => void }) {
  return (
    <div className="w-full animate-pop text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft">
        <Sparkles className="h-4 w-4" /> Pesquisa rápida · 30 segundos
      </div>
      <h1 className="text-balance font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
        Olá! Como podemos te chamar?
      </h1>
      <p className="mt-4 text-balance text-base text-muted-foreground md:text-xl">
        Sua opinião nos ajuda a cuidar melhor de você 💚
      </p>

      <form
        className="mx-auto mt-10 max-w-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          onNext(String(formData.get("firstName") ?? ""));
        }}
      >
        <input
          autoFocus
          name="firstName"
          defaultValue={name}
          maxLength={50}
          placeholder="Digite seu primeiro nome"
          className="w-full rounded-3xl border-2 border-border bg-card px-6 py-5 text-center text-xl font-medium text-foreground placeholder:text-muted-foreground/60 shadow-card transition focus:border-primary focus:outline-none md:text-2xl"
        />
        <button
          type="submit"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-gradient-hero px-8 py-5 text-lg font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02] active:scale-100 md:text-xl"
        >
          Continuar <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}

function RatingStep({ name, onRate, submitting }: { name: string; onRate: (r: "gostei" | "nao_gostei") => void; submitting: boolean }) {
  return (
    <div className="w-full animate-pop text-center">
      <p className="mb-3 font-display text-lg font-semibold text-primary md:text-xl">Oi, {name}! 👋</p>
      <h1 className="text-balance font-display text-4xl font-extrabold leading-tight text-foreground md:text-6xl">
        O que você achou<br />da ação?
      </h1>
      <p className="mt-4 text-balance text-base text-muted-foreground md:text-lg">
        Toque numa das opções abaixo
      </p>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <RatingCard
          onClick={() => !submitting && onRate("gostei")}
          icon={<ThumbsUp className="h-12 w-12" strokeWidth={2.5} />}
          label="Gostei"
          emoji="😊"
          gradient="bg-gradient-success"
          disabled={submitting}
        />
        <RatingCard
          onClick={() => !submitting && onRate("nao_gostei")}
          icon={<ThumbsDown className="h-12 w-12" strokeWidth={2.5} />}
          label="Não gostei"
          emoji="😕"
          gradient="bg-gradient-warm"
          disabled={submitting}
        />
      </div>
    </div>
  );
}

function RatingCard({
  onClick, icon, label, emoji, gradient, disabled,
}: { onClick: () => void; icon: React.ReactNode; label: string; emoji: string; gradient: string; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-3xl ${gradient} p-8 text-primary-foreground shadow-glow transition disabled:opacity-60 hover:scale-[1.03] active:scale-95 md:p-10`}
    >
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl transition group-hover:scale-150" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="text-6xl md:text-7xl">{emoji}</div>
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-display text-3xl font-extrabold md:text-4xl">{label}</span>
        </div>
      </div>
    </button>
  );
}

function DoneStep({ name }: { name: string }) {
  return (
    <div className="w-full animate-pop text-center">
      <div className="mx-auto mb-8 grid h-32 w-32 place-items-center rounded-full bg-gradient-success shadow-glow md:h-40 md:w-40">
        <Check className="h-16 w-16 text-primary-foreground md:h-20 md:w-20" strokeWidth={3} />
      </div>
      <h1 className="text-balance font-display text-4xl font-extrabold text-foreground md:text-6xl">
        Obrigado, {name}!
      </h1>
      <p className="mt-4 text-balance text-lg text-muted-foreground md:text-2xl">
        Sua opinião foi registrada 💚
      </p>
      <p className="mt-8 text-sm text-muted-foreground">Voltando ao início em instantes…</p>
    </div>
  );
}
