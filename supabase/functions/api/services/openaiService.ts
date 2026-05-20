export class OpenAIConfigError extends Error {}
export class OpenAIRequestError extends Error {}
export class OpenAIJSONError extends Error {}

export function getOpenAIModel(): string {
  return (Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini").trim() || "gpt-4o-mini";
}

export async function generateRecipeWithOpenAI(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!apiKey) throw new OpenAIConfigError("Missing OPENAI_API_KEY for Edge Function OpenAI generation.");

  const model = getOpenAIModel();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new OpenAIRequestError(`OpenAI request failed with status ${res.status}.`);

  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  const choices = (data?.choices as Array<Record<string, unknown>> | undefined) || [];
  const content = choices[0]?.message && (choices[0].message as Record<string, unknown>).content;

  if (!content || typeof content !== "string") throw new OpenAIRequestError("OpenAI returned empty response.");

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new OpenAIJSONError("OpenAI returned invalid JSON.");
  }
}
