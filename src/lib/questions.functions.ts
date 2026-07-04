import { createServerFn } from "@tanstack/react-start";
import { generateText, Output, NoObjectGeneratedError } from "ai";
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
});

export type Question = z.infer<typeof QuestionSchema>;

const Input = z.object({
  topic: z.enum(TOPICS),
});

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

Gere UMA questão inédita inspirada em uma questão oficial do ENEM. Informe também o ano da questão oficial que inspirou (campo anoReferencia, ex: "Inspirada em ENEM 2019").`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        system,
        prompt,
        experimental_output: Output.object({ schema: QuestionSchema }),
      });
      return experimental_output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("Não foi possível gerar a questão. Tente novamente.");
      }
      throw error;
    }
  });