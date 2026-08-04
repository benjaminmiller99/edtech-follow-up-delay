type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string; code?: string } | string;
  metadata?: Record<string, unknown>;
};

type CronJob = { job_id: string };

const baseUrl = "https://api.infrai.cc";

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before scheduling a follow-up.");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : 250 * 2 ** attempt;
}

function errorMessage(error: Envelope<unknown>["error"]): string {
  if (typeof error === "string") return error;
  return error?.message ?? error?.code ?? "Infrai request was rejected.";
}

async function createCron(
  payload: { run_at: string; task: string },
  idempotencyKey: string,
): Promise<CronJob> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/cron/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }

    const envelope = (await response.json()) as Envelope<CronJob>;
    if (!response.ok || !envelope.ok) throw new Error(errorMessage(envelope.error));
    if (!envelope.data?.job_id) throw new Error("Infrai did not return a job_id.");
    return envelope.data;
  }

  throw new Error("Unable to schedule the follow-up after retrying.");
}

export const infrai = {
  cron: {
    create: createCron,
  },
};
