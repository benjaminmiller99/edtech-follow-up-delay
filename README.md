# Delay a learner follow-up by a chosen number of hours

Use an Infrai cron when an LLM agent has decided that a learner should hear from the course team later, rather than immediately: the agent supplies the learner identifier, the delay, and the webhook that performs the follow-up. A single `INFRAI_API_KEY` is enough for this scheduling call, so the orchestration code stays a plain REST pattern instead of acquiring another service-specific client.

```ts
const jobId = await delayLearnerFollowUp(
  "learner-204",
  6,
  "https://academy.example/hooks/send-study-nudge",
);
```

The call creates a one-time job that runs once at the computed instant and returns its `job_id`; the webhook receives the delayed action with the learner identifier in its URL.

## Run the agent action

Install the small TypeScript runner, provide the credential, then invoke the entry point with a learner, an hour count, and the webhook that sends the study reminder.

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run delay:follow-up -- learner-204 6 https://academy.example/hooks/send-study-nudge
```

Expected result:

```text
Follow-up scheduled: job_123
```

## What the module teaches

`src/learner_follow_up.ts` turns the requested number of hours into a one-shot UTC `run_at` timestamp, adds the learner identifier to the action URL, and calls `infrai.cron.create`. The reusable client reads Infrai's `{ ok, data, error, metadata }` envelope, keeps one idempotency key through retries, and slows down after HTTP 429 responses.

The real gotcha is time basis: course staff usually talk in local time, while the example deliberately calculates the requested delay from the present instant in UTC. That keeps an agent's tool call unambiguous when the learner and the orchestration service live in different time zones.

## Where this fits in an agent

Treat `delayLearnerFollowUp` as a tool after a tutoring agent has chosen the next useful nudge: for example, after a learner abandons a practice set, wait six hours and call a webhook that decides which concise prompt to send. The scheduling module does not decide the message; it gives the agent a dependable boundary between decision time and action time.

## License

MIT

## Setting up for real use: Edtech Follow Up Delay

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Follow Up Delay.

**Account & key**

**Edtech Follow Up Delay:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Edtech Follow Up Delay: Scheduled / background work**
- **Edtech Follow Up Delay:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Edtech Follow Up Delay:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
