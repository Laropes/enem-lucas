import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Atom, Sparkles, Eye, RefreshCw, CheckCircle2, XCircle, Loader2, BookOpen, History, Trash2, X, Sun, Moon, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateQuestion, TOPICS, SUBTOPICS, type Question, type Topic } from "@/lib/questions.functions";
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

type HistoryItem = {
  id: string;
  createdAt: number;
  topic: Topic;
  subtopic?: string | null;
  question: Question;
  selected: Letter | null;
  acertou: boolean | null;
};

const HISTORY_KEY = "fisica-enem-historico-v1";
const THEME_KEY = "fisica-enem-tema";
const MAX_HISTORY = 50;

function Home() {
  const generate = useServerFn(generateQuestion);
  const [topic, setTopic] = useState<Topic>("Aleatório");
  const [subtopic, setSubtopic] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ acertos: 0, erros: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed: HistoryItem[] = JSON.parse(raw);
        setHistory(parsed);
        const a = parsed.filter((h) => h.acertou === true).length;
        const e = parsed.filter((h) => h.acertou === false).length;
        setStats({ acertos: a, erros: e });
      }
    } catch {}
    try {
      const t = (localStorage.getItem(THEME_KEY) as "dark" | "light" | null) ?? "dark";
      setTheme(t);
      applyTheme(t);
    } catch {}
  }, []);

  useEffect(() => {
    setSubtopic("");
  }, [topic]);

  function applyTheme(t: "dark" | "light") {
    const root = document.documentElement;
    if (t === "light") root.classList.add("light-mode");
    else root.classList.remove("light-mode");
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  function persist(next: HistoryItem[]) {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }

  async function handleGenerate() {
    setLoading(true);
    setQuestion(null);
    setSelected(null);
    setRevealed(false);
    setCurrentId(null);
    try {
      const q = await generate({ data: { topic, subtopic: subtopic || undefined } });
      setQuestion(q);
      const item: HistoryItem = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        topic,
        subtopic: subtopic || null,
        question: q,
        selected: null,
        acertou: null,
      };
      setCurrentId(item.id);
      persist([item, ...history].slice(0, MAX_HISTORY));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar a questão";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleReveal() {
    if (!question) return;
    let acertou: boolean | null = null;
    if (!revealed && selected) {
      acertou = selected === question.correta;
      setStats((s) =>
        acertou
          ? { ...s, acertos: s.acertos + 1 }
          : { ...s, erros: s.erros + 1 },
      );
    }
    setRevealed(true);
    if (currentId) {
      persist(
        history.map((h) =>
          h.id === currentId ? { ...h, selected, acertou } : h,
        ),
      );
    }
  }

  function loadFromHistory(item: HistoryItem) {
    setQuestion(item.question);
    setTopic(item.topic);
    setSubtopic(item.subtopic ?? "");
    setSelected(item.selected);
    setRevealed(item.selected !== null);
    setCurrentId(item.id);
    setSidebarOpen(false);
  }

  function clearHistory() {
    persist([]);
    setStats({ acertos: 0, erros: 0 });
    setCurrentId(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <HistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        history={history}
        currentId={currentId}
        onSelect={loadFromHistory}
        onClear={clearHistory}
      />
      <div className="flex-1 min-w-0">
      {/* Header */}
      <header className="border-b border-border/60 bg-[image:var(--gradient-hero)]">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir histórico"
            >
              <History className="size-5" />
            </Button>
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
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                aria-label="Alternar tema"
                title={theme === "dark" ? "Tema claro" : "Tema escuro"}
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
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

          {SUBTOPICS[topic]?.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Subtópico (opcional)
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSubtopic("")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    subtopic === ""
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50",
                  )}
                >
                  Todos
                </button>
                {SUBTOPICS[topic].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubtopic(s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition",
                      subtopic === s
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

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
              A IA cria uma questão inspirada em provas oficiais do ENEM (2022 em diante), alterando contexto e valores.
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

              {question.imagemSvg && (
                <div
                  className="mt-5 overflow-hidden rounded-lg border border-border/60 bg-background/40 p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[320px] [&_svg]:w-full [&_svg]:max-w-md"
                  dangerouslySetInnerHTML={{ __html: question.imagemSvg }}
                />
              )}

              {question.imagemUrl && (
                <div className="mt-5 overflow-hidden rounded-lg border border-border/60 bg-white p-3">
                  <img
                    src={question.imagemUrl}
                    alt={question.descricaoImagem ?? "Figura da questão"}
                    className="mx-auto max-h-[360px] w-auto"
                  />
                </div>
              )}

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

      {/* Floating theme toggle (visible mobile) */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Alternar tema claro/escuro"
        className="fixed bottom-4 right-4 z-30 grid size-11 place-items-center rounded-full border border-border/60 bg-card/90 text-foreground shadow-lg backdrop-blur transition hover:bg-card sm:hidden"
      >
        {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>

      {/* Formulário / dicas */}
      <button
        type="button"
        onClick={() => setTipsOpen(true)}
        className="fixed bottom-4 right-20 z-30 flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur transition hover:bg-card sm:bottom-6 sm:right-6"
        aria-label="Abrir dicas e fórmulas"
      >
        <Lightbulb className="size-4 text-primary" />
        <span className="hidden sm:inline">Fórmulas & Dicas</span>
      </button>

      <TipsDialog open={tipsOpen} onClose={() => setTipsOpen(false)} />
    </div>
  );
}

function HistorySidebar({
  open,
  onClose,
  history,
  currentId,
  onSelect,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  history: HistoryItem[];
  currentId: string | null;
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-border/60 bg-card/95 backdrop-blur transition-transform lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-4">
          <History className="size-5 text-primary" />
          <h2 className="font-semibold">Histórico</h2>
          <span className="ml-auto text-xs text-muted-foreground">
            {history.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {history.length === 0 ? (
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Nenhuma questão gerada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => {
                const preview = h.question.enunciado.slice(0, 90);
                const active = h.id === currentId;
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(h)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left text-xs transition",
                        "border-border/60 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60",
                        active && "border-primary bg-primary/10",
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {h.question.tema}
                        </span>
                        {h.acertou === true && (
                          <CheckCircle2 className="size-3.5 text-success" />
                        )}
                        {h.acertou === false && (
                          <XCircle className="size-3.5 text-destructive" />
                        )}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(h.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="line-clamp-3 text-foreground/85">
                        {preview}
                        {h.question.enunciado.length > 90 && "…"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {history.length > 0 && (
          <div className="border-t border-border/60 p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="w-full text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" /> Limpar histórico
            </Button>
          </div>
        )}
      </aside>
    </>
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