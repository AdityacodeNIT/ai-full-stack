import { createAgent, gemini } from "@inngest/agent-kit";
import Groq from "groq-sdk";
import {
  prompt,
  evaluationPrompt,
  combinedPrompt,
  batchQuestionPrompt,
  batchEvaluationPrompt,
} from "./prompt.js";
import dotenv from "dotenv";
import { logger } from "../../utils/logger.js";

dotenv.config();

// PROVIDER SELECTION

const USE_GROQ = !!process.env.GROQ_API_KEY;

if (USE_GROQ) {
  logger.log(" Using Groq (unlimited free tier)");
} else {
  logger.log(" Using Gemini (limited free tier)");
}

// GROQ CLIENT

let groqClient;
if (USE_GROQ) {
  groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

// MULTI-KEY ROTATION (GEMINI)
const API_KEYS = process.env.GEMINI_API_KEYS
  ? process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim())
  : [process.env.GEMINI_API_KEY];

if (!USE_GROQ && (!API_KEYS.length || !API_KEYS[0])) {
  throw new Error("GEMINI_API_KEY or GEMINI_API_KEYS missing");
}

let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  logger.log(
    `Using Gemini API key ${currentKeyIndex + 1}/${API_KEYS.length}`,
  );
  return key;
}

if (!USE_GROQ) {
  logger.log(` Loaded ${API_KEYS.length} Gemini API key(s)`);
}

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

class RotatingAgent {
  constructor(name, systemPrompt) {
    this.name = name;
    this.systemPrompt = systemPrompt;
  }

  async run(input, options) {
    await acquireSlot();

    try {
      if (USE_GROQ) {
        const completion = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: this.systemPrompt },
            {
              role: "user",
              content: input.input?.instruction || input.instruction,
            },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 2048,
        });

        return {
          output: [
            {
              content: completion.choices[0].message.content,
            },
          ],
        };
      } else {
        const apiKey = getNextApiKey();
        const agent = createAgent({
          name: this.name,
          system: this.systemPrompt,
          model: gemini({
            model: "gemini-2.5-flash",
            apiKey: apiKey,
          }),
        });

        return await agent.run(input, options);
      }
    } catch (err) {
      logger.error(` ${this.name} failed:`, err?.message || err);
      throw err;
    } finally {
      releaseSlot();
    }
  }
}

const interviewAgent = new RotatingAgent("Interview Agent", prompt);
const interviewEvaluationAgent = new RotatingAgent(
  "Interview Evaluation Agent",
  evaluationPrompt,
);
const combinedAgent = new RotatingAgent(
  "Combined Interview Agent",
  combinedPrompt,
);
const batchQuestionAgent = new RotatingAgent(
  "Batch Question Generator",
  batchQuestionPrompt,
);
const batchEvaluationAgent = new RotatingAgent(
  "Batch Evaluation Agent",
  batchEvaluationPrompt,
);

export {
  interviewAgent,
  interviewEvaluationAgent,
  combinedAgent,
  batchQuestionAgent,
  batchEvaluationAgent,
};
