import { createServerFn } from "@tanstack/react-start";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const TOPICS = [
  "Aleatório",
  "Mecânica",
  "Termologia",
  "Óptica",
  "Ondulatória",
  "Eletricidade",
  "Magnetismo",
  "Física Moderna",
] as const;

export type Topic = (typeof TOPICS)[number];

const QuestionSchema = z.object({
  tema: z.string(),
  enunciado: z.string(),
  alternativas: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
    E: z.string(),
  }),
  correta: z.enum(["A", "B", "C", "D", "E"]),
  resolucao: z.string(),
  anoReferencia: z.string(),
  imagemSvg: z.string().optional(),
});

const RawQuestionSchema = z
  .object({
    tema: z.string().optional(),
    titulo: z.string().optional(),
    enunciado: z.string(),
    alternativas: z.object({
      A: z.string(),
      B: z.string(),
      C: z.string(),
      D: z.string(),
      E: z.string(),
    }),
    correta: z.enum(["A", "B", "C", "D", "E"]).optional(),
    alternativaCorreta: z.enum(["A", "B", "C", "D", "E"]).optional(),
    resolucao: z.string(),
    anoReferencia: z.string(),
    imagemSvg: z.string().optional(),
  })
  .transform((question) => ({
    tema: question.tema ?? question.titulo ?? "Física do ENEM",
    enunciado: question.enunciado,
    alternativas: question.alternativas,
    correta: question.correta ?? question.alternativaCorreta ?? "A",
    resolucao: question.resolucao,
    anoReferencia: question.anoReferencia,
    imagemSvg: question.imagemSvg,
  }));

export type Question = z.infer<typeof QuestionSchema>;

const Input = z.object({
  topic: z.enum(TOPICS),
});

function parseQuestionFromText(text: string | undefined): Question | null {
  if (!text) return null;

  const trimmed = text.trim();
  const jsonText = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)?.[1] ?? trimmed;

  try {
    const parsed = JSON.parse(jsonText);
    const firstQuestion = Array.isArray(parsed) ? parsed[0] : parsed;
    return QuestionSchema.parse(RawQuestionSchema.parse(firstQuestion));
  } catch (parseError) {
    console.error("Falha ao normalizar questão gerada:", parseError);
    return null;
  }
}

export const generateQuestion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const gateway = createLovableAiGatewayProvider(key);

    const topicInstruction =
      data.topic === "Aleatório"
        ? "Escolha um tema qualquer de Física do ENEM (Mecânica, Termologia, Óptica, Ondulatória, Eletricidade, Magnetismo ou Física Moderna)."
        : `O tema deve ser obrigatoriamente ${data.topic}.`;

    const system = `Você é um professor de Física especialista no ENEM (Exame Nacional do Ensino Médio brasileiro). Sua tarefa é criar uma questão de Física NO ESTILO DO ENEM, baseada em uma questão OFICIAL já aplicada em edições anteriores do ENEM, mas alterando os valores numéricos, o contexto/situação e os nomes, mantendo o mesmo conceito físico e nível de dificuldade.

Regras obrigatórias:
- A questão deve ter enunciado contextualizado (situação-problema do cotidiano, tecnologia, natureza ou sociedade), como é característico do ENEM.
- Exatamente 5 alternativas de A até E, apenas uma correta.
- As alternativas incorretas devem ser plausíveis (erros conceituais comuns ou de cálculo típicos).
- A resolução deve explicar passo a passo o raciocínio físico e os cálculos, citando fórmulas usadas.
- Escreva TUDO em português do Brasil.
- Use notação simples (ex: m/s, m/s², N, J, W) sem LaTeX.
- Nunca reproduza o texto original de uma questão do ENEM; adapte contexto e números.`;

    const prompt = `${topicInstruction}

Gere UMA questão inédita inspirada em uma questão oficial do ENEM. Informe também o ano da questão oficial que inspirou (campo anoReferencia, ex: "Inspirada em ENEM 2019").

Sempre que o problema envolver diagramas (circuitos, forças, planos inclinados, lentes, ondas, gráficos etc.), inclua o campo opcional "imagemSvg" com um SVG INLINE COMPLETO (começando com <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" ...>) representando a figura da questão. Use traços simples, rótulos, setas para vetores, cores claras contra fundo escuro (stroke branco/cinza claro, fill transparente). Se a questão não precisar de figura, OMITA o campo imagemSvg.

Responda como um único objeto JSON com exatamente estes campos: tema, enunciado, alternativas, correta, resolucao, anoReferencia e opcionalmente imagemSvg. O campo alternativas deve ter as chaves A, B, C, D e E. O campo correta deve ser apenas uma letra de A até E.`;

    try {
      const { object } = await generateObject({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
        schema: QuestionSchema,
        maxOutputTokens: 3000,
      });
      return object;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const fallbackQuestion = parseQuestionFromText(error.text);
        if (fallbackQuestion) return fallbackQuestion;

        console.error("NoObjectGenerated:", error.text);
        throw new Error("Não foi possível gerar a questão. Tente novamente.");
      }
      throw error;
    }
  });