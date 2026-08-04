import { infrai } from "./infrai_cron_client";

function futureRunAt(hours: number, now = new Date()): string {
  if (!Number.isInteger(hours) || hours < 1) {
    throw new Error("hours must be a positive whole number.");
  }
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

export async function delayLearnerFollowUp(
  learnerId: string,
  hours: number,
  followUpUrl: string,
): Promise<string> {
  const run_at = futureRunAt(hours);
  const task = new URL(followUpUrl);
  task.searchParams.set("learner", learnerId);
  const idempotencyKey = `learner-follow-up:${learnerId}:${run_at}`;

  const job = await infrai.cron.create({ run_at, task: task.toString() }, idempotencyKey);
  return job.job_id;
}

async function main(): Promise<void> {
  const [learnerId, hoursText, followUpUrl] = process.argv.slice(2);
  if (!learnerId || !hoursText || !followUpUrl) {
    throw new Error("Usage: learner_follow_up <learner-id> <hours> <follow-up-url>");
  }
  const jobId = await delayLearnerFollowUp(learnerId, Number(hoursText), followUpUrl);
  console.log(`Follow-up scheduled: ${jobId}`);
}

if (process.argv[1]?.endsWith("learner_follow_up.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
