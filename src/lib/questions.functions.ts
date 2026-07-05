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

export const SUBTOPICS: Record<Topic, string[]> = {
  "Aleatório": [],
  "Mecânica": [
    "Cinemática (MU e MUV)",
    "Lançamentos e queda livre",
    "Leis de Newton",
    "Trabalho e Energia",
    "Impulso e Quantidade de Movimento",
    "Estática e Equilíbrio",
    "Hidrostática",
    "Gravitação",
  ],
  "Termologia": [
    "Temperatura e Escalas",
    "Dilatação Térmica",
    "Calorimetria",
    "Mudanças de Estado",
    "Transmissão de Calor",
    "Gases Ideais",
    "Termodinâmica",
  ],
  "Óptica": [
    "Reflexão e Espelhos",
    "Refração e Lentes",
    "Instrumentos Ópticos",
    "Óptica da Visão",
  ],
  "Ondulatória": [
    "Ondas Mecânicas",
    "Som e Acústica",
    "Efeito Doppler",
    "Interferência e Difração",
  ],
  "Eletricidade": [
    "Carga e Lei de Coulomb",
    "Campo e Potencial Elétrico",
    "Corrente e Resistores",
    "Circuitos e Leis de Kirchhoff",
    "Potência e Consumo",
    "Capacitores",
  ],
  "Magnetismo": [
    "Campo Magnético",
    "Força Magnética",
    "Indução Eletromagnética",
    "Transformadores",
  ],
  "Física Moderna": [
    "Efeito Fotoelétrico",
    "Dualidade Onda-Partícula",
    "Modelos Atômicos",
    "Radioatividade",
    "Relatividade",
  ],
};

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
  descricaoImagem: z.string().optional(),
  imagemUrl: z.string().optional(),
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
    descricaoImagem: z.string().optional(),
  })
  .transform((question) => ({
    tema: question.tema ?? question.titulo ?? "Física do ENEM",
    enunciado: question.enunciado,
    alternativas: question.alternativas,
    correta: question.correta ?? question.alternativaCorreta ?? "A",
    resolucao: question.resolucao,
    anoReferencia: question.anoReferencia,
    imagemSvg: question.imagemSvg,
    descricaoImagem: question.descricaoImagem,
  }));

export type Question = z.infer<typeof QuestionSchema>;

const Input = z.object({
  topic: z.enum(TOPICS),
  subtopic: z.string().optional(),
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
        : `O tema deve ser obrigatoriamente ${data.topic}${
            data.subtopic ? `, com foco específico no subtópico: ${data.subtopic}.` : "."
          }`;

    const system = `Você é um professor de Física especialista no ENEM (Exame Nacional do Ensino Médio brasileiro). Sua tarefa é criar uma questão de Física NO ESTILO DO ENEM, baseada em uma questão OFICIAL já aplicada em edições anteriores do ENEM, mas alterando os valores numéricos, o contexto/situação e os nomes, mantendo o mesmo conceito físico e nível de dificuldade.

Regras obrigatórias:
- A questão deve ter enunciado contextualizado (situação-problema do cotidiano, tecnologia, natureza ou sociedade), como é característico do ENEM.
- Exatamente 5 alternativas de A até E, apenas uma correta.
- As alternativas incorretas devem ser plausíveis (erros conceituais comuns ou de cálculo típicos).
- A resolução deve explicar passo a passo o raciocínio físico e os cálculos, citando fórmulas usadas.
- Escreva TUDO em português do Brasil.
- Use notação simples (ex: m/s, m/s², N, J, W) sem LaTeX.
- Nunca reproduza o texto original de uma questão do ENEM; adapte contexto e números.
- IMPORTANTE: use apenas questões do ENEM de 2022 em diante (ENEM 2022, 2023, 2024 ou 2025) como inspiração. Nunca use questões anteriores a 2022. O campo anoReferencia deve começar obrigatoriamente com "Inspirada em ENEM 20XX" onde XX é 22, 23, 24 ou 25.`;

    const prompt = `${topicInstruction}

Gere UMA questão inédita inspirada em uma questão OFICIAL do ENEM aplicada entre 2022 e 2025. Informe o ano da questão oficial que inspirou no campo anoReferencia (ex: "Inspirada em ENEM 2023"). Não use questões anteriores a 2022.

Sempre que o problema envolver diagramas (circuitos, forças, planos inclinados, lentes, ondas, gráficos etc.), inclua o campo opcional "descricaoImagem" com uma descrição VISUAL DETALHADA em português da figura que deve acompanhar a questão. Descreva de forma clara e específica todos os elementos, rótulos, vetores, ângulos e valores relevantes (ex: "Diagrama esquemático de um plano inclinado de 30° com um bloco de massa m sobre a superfície, seta indicando o vetor peso vertical para baixo e vetor normal perpendicular ao plano, rótulos 'm', 'θ=30°', 'N', 'P'."). Não inclua o campo imagemSvg. Se a questão não precisar de figura, OMITA descricaoImagem.

Responda como um único objeto JSON com exatamente estes campos: tema, enunciado, alternativas, correta, resolucao, anoReferencia e opcionalmente descricaoImagem. O campo alternativas deve ter as chaves A, B, C, D e E. O campo correta deve ser apenas uma letra de A até E.`;

    try {
      const { object } = await generateObject({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
        schema: QuestionSchema,
        maxOutputTokens: 3000,
      });
      return await withImage(object, key);
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const fallbackQuestion = parseQuestionFromText(error.text);
        if (fallbackQuestion) return await withImage(fallbackQuestion, key);

        console.error("NoObjectGenerated:", error.text);
        throw new Error("Não foi possível gerar a questão. Tente novamente.");
      }
      throw error;
    }
  });

async function withImage(question: Question, apiKey: string): Promise<Question> {
  if (!question.descricaoImagem) return question;
  try {
    const imagemUrl = await generateDiagramImage(question.descricaoImagem, apiKey);
    return { ...question, imagemUrl };
  } catch (err) {
    console.error("Falha ao gerar imagem da questão:", err);
    return question;
  }
}

async function generateDiagramImage(descricao: string, apiKey: string): Promise<string> {
  const prompt = `Diagrama didático de física estilo livro escolar, limpo e simples, fundo branco, linhas pretas nítidas, rótulos legíveis em português, setas para vetores quando aplicável, sem sombras realistas nem estilo 3D fotorrealista. Represente com precisão: ${descricao}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    throw new Error(`Image gen failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("Sem imagem retornada");
  return `data:image/png;base64,${b64}`;
}