import { createAgent, gemini } from "@inngest/agent-kit";
import { prompt, evaluationPrompt } from "./prompt.js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY missing");
}

/* ─────────────────────────────
   RATE LIMIT + CONCURRENCY GUARD
───────────────────────────── */

const MAX_CONCURRENT_CALLS = 2;
const MIN_CALL_INTERVAL_MS = 1200;

let activeCalls = 0;
let lastCallTime = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireSlot() {
  while (activeCalls >= MAX_CONCURRENT_CALLS) {
    await wait(100);
  }

  const now = Date.now();
  const sinceLast = now - lastCallTime;

  if (sinceLast < MIN_CALL_INTERVAL_MS) {
    await wait(MIN_CALL_INTERVAL_MS - sinceLast);
  }

  activeCalls++;
  lastCallTime = Date.now();
}

function releaseSlot() {
  activeCalls = Math.max(0, activeCalls - 1);
}

/* ─────────────────────────────
   APPLY RATE LIMIT (SAFE)
───────────────────────────── */

function applyRateLimit(agent, name) {
  if (typeof agent.run !== "function") {
    throw new Error(`${name} has no run() method`);
  }

  const originalRun = agent.run.bind(agent);

  agent.run = async (input, options) => {
    await acquireSlot();
    try {
      return await originalRun(input, options);
    } catch (err) {
      console.error(`❌ ${name} failed:`, err?.message || err);
      throw err;
    } finally {
      releaseSlot();
    }
  };

  return agent;
}

/* ─────────────────────────────
   BASE AGENTS
───────────────────────────── */

const interviewAgent = applyRateLimit(
  createAgent({
    name: "Interview Agent",
    system: prompt,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
  }),
  "InterviewAgent"
);

const interviewEvaluationAgent = applyRateLimit(
  createAgent({
    name: "Interview Evaluation Agent",
    system: evaluationPrompt,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    }),
  }),
  "InterviewEvaluationAgent"
);

export { interviewAgent, interviewEvaluationAgent };
