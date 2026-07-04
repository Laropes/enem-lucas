import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Atom, Sparkles, Eye, RefreshCw, CheckCircle2, XCircle, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateQuestion, TOPICS, type Question, type Topic } from "@/lib/questions.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Física ENEM — Gerador de Questões com IA" },
      { name: "description", content: "Treine Física para o ENEM com questões inéditas geradas por IA, inspiradas em provas oficiais." },
    ],
  }),
});

type Letter = "A" | "B" | "C" | "D" | "E";
const LETTERS: Letter[] = ["A", "B", "C", "D", "E"];

function Home() {
  const generate = useServerFn(generateQuestion);
  const [topic, setTopic] = useState<Topic>("Aleatório");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ acertos: 0, erros: 0 });

  async function handleGenerate() {
    setLoading(true);
    setQuestion(null);
    setSelected(null);
    setRevealed(false);
    try {
      const q = await generate({ data: { topic } });
      setQuestion(q);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar a questão";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleReveal() {
    if (!question) return;
    if (!revealed && selected) {
      setStats((s) =>
        selected === question.correta
          ? { ...s, acertos: s.acertos + 1 }
          : { ...s, erros: s.erros + 1 },
      );
    }
    setRevealed(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/60 bg-[image:var(--gradient-hero)]">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
              <Atom className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Física ENEM
              </h1>
              <p className="text-sm text-muted-foreground">
                Questões inéditas geradas por IA, no estilo oficial do ENEM
              </p>
            </div>
            <div className="ml-auto hidden items-center gap-4 sm:flex">
              <StatPill label="Acertos" value={stats.acertos} tone="success" />
              <StatPill label="Erros" value={stats.erros} tone="destructive" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Topic selector */}
        <Card className="border-border/60 bg-card/60 p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="size-4" />
            Escolha o tema da questão
          </div>
          <Tabs value={topic} onValueChange={(v) => setTopic(v as Topic)}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-secondary/50 p-1">
              {TOPICS.map((t) => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="data-[state=active]:bg-[image:var(--gradient-primary)] data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Gerando…
                </>
              ) : question ? (
                <>
                  <RefreshCw className="size-4" /> Nova questão
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Criar questão
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              A IA cria uma questão inspirada em provas oficiais do ENEM, alterando contexto e valores.
            </p>
          </div>
        </Card>

        {/* Question */}
        <div className="mt-6">
          {loading && <SkeletonQuestion />}

          {!loading && !question && (
            <Card className="border-dashed border-border/60 bg-card/30 p-10 text-center">
              <Atom className="mx-auto size-10 text-muted-foreground/70" />
              <p className="mt-3 text-sm text-muted-foreground">
                Escolha um tema acima e clique em <span className="font-semibold text-foreground">Criar questão</span> para começar.
              </p>
            </Card>
          )}

          {!loading && question && (
            <Card className="border-border/60 bg-card p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  {question.tema}
                </span>
                <span className="text-xs text-muted-foreground">
                  {question.anoReferencia}
                </span>
              </div>

              <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/95">
                {question.enunciado}
              </p>

              <div className="mt-6 space-y-2">
                {LETTERS.map((L) => {
                  const isSelected = selected === L;
                  const isCorrect = revealed && L === question.correta;
                  const isWrongPick = revealed && isSelected && L !== question.correta;
                  return (
                    <button
                      key={L}
                      type="button"
                      onClick={() => !revealed && setSelected(L)}
                      disabled={revealed}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                        "border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60",
                        isSelected && !revealed && "border-primary bg-primary/10",
                        isCorrect && "border-success bg-success/15",
                        isWrongPick && "border-destructive bg-destructive/15",
                        revealed && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-md border text-sm font-bold",
                          "border-border/60 bg-background/40",
                          isSelected && !revealed && "border-primary bg-primary text-primary-foreground",
                          isCorrect && "border-success bg-success text-primary-foreground",
                          isWrongPick && "border-destructive bg-destructive text-destructive-foreground",
                        )}
                      >
                        {L}
                      </span>
                      <span className="pt-1 text-sm leading-relaxed">
                        {question.alternativas[L]}
                      </span>
                      {isCorrect && <CheckCircle2 className="ml-auto size-5 shrink-0 text-success" />}
                      {isWrongPick && <XCircle className="ml-auto size-5 shrink-0 text-destructive" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  variant={revealed ? "secondary" : "default"}
                  onClick={handleReveal}
                  disabled={revealed}
                >
                  <Eye className="size-4" />
                  {revealed ? "Resposta revelada" : "Mostrar resposta"}
                </Button>
                <Button variant="outline" onClick={handleGenerate}>
                  <RefreshCw className="size-4" /> Próxima
                </Button>
                {revealed && selected && (
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      selected === question.correta ? "text-success" : "text-destructive",
                    )}
                  >
                    {selected === question.correta
                      ? "Você acertou! 🎉"
                      : `Você marcou ${selected}. A correta é ${question.correta}.`}
                  </span>
                )}
              </div>

              {revealed && (
                <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-accent">
                    <BookOpen className="size-4" />
                    Resolução
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {question.resolucao}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        <footer className="mt-10 pb-6 text-center text-xs text-muted-foreground">
          Feito para estudar Física do ENEM • Questões geradas por IA
        </footer>
      </main>
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "success" | "destructive" }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs">
      <span
        className={cn(
          "size-2 rounded-full",
          tone === "success" ? "bg-success" : "bg-destructive",
        )}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function SkeletonQuestion() {
  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-6 space-y-2">
        {LETTERS.map((L) => (
          <div key={L} className="h-12 animate-pulse rounded-lg bg-muted/70" />
        ))}
      </div>
    </Card>
  );
}