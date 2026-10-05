import fs from "node:fs";
import path from "node:path";
import { evaluateAndScore, rewriter } from "./evaluator.js";
import OpenAI from "openai";
import dotenv from "dotenv";


// load dotenv
dotenv.config({ debug: true })


// Ollama configs -> load
const LLM_URL = process.env.LLM_URL || "http://localhost:11434/v1";
const MODEL = process.env.LLM_MODEL || "llama3.2:latest";
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT) || 7_200_000;
const STUB_MODE = process.env.LLM_STUB === "true";
let attempts = 0;
const MAX_TOOL_ROUNDS = 6; // evaluator + rewriter × 3

// Check model existence -> loads
if (!MODEL) {
  throw new Error("LLM_MODEL is not configured");
}

// Validate timout
if (!Number.isFinite(TIMEOUT_MS) || TIMEOUT_MS <= 0) {
  throw new Error("OLLAMA_TIMEOUT_MS must be a positive number");
}

const client = new OpenAI({
  apiKey: "ollama",
  baseURL: LLM_URL,
  timeout: TIMEOUT_MS,
});


// Load versioned prompt from file
const PROMPTS_DIR = "./prompts";

const loadPrompt = () => {
  const promptPath = path.join(PROMPTS_DIR, "/parse-todo-v1.txt");
  return fs.readFileSync(promptPath, "utf-8");
};

// STUB respose -> used when the STUB_MODE is true
// Lets us build and test the pipeline without Ollama running
const stubResponse = (text) => ({
  title: `[STUB] ${text.slice(0, 60)}`,
  done: false,
  confidence: 0.99,
  warnings: ["✔ Stub mode active -> Not a real LLM response"],
});

const tools = [
  {
    type: "function",
    function: {
      name: "evaluateAndScore",
      description: `
        Evaluate a candidate output against the original user request.

        Check:
        1. Correctness — does the candidate accurately represent the request?
        2. Completeness — are all required pieces of information present?
        3. Consistency — does the candidate contradict the request?
        4. Schema compliance — does it conform to the required structure?

        Return a score between 0 and 1 and explain any problems.

        Do not rewrite the candidate. Your job is evaluation only.
      `.trim(),

      parameters: {
        type: "object",
        required: ["userRequest", "candidate"],
        properties: {
          userRequest: {
            type: "string",
            description: "The original user's request.",
          },
          candidate: {
            type: "object",
            description: "The candidate output being evaluated.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rewriter",
      description: `
        Rewrite the candidate output to correct the issues identified by
        evaluateAndScore.

        Preserve all information that is already correct. Only make changes
        necessary to address the identified issues.

        Do not invent information that is not present in the original user
        request.

        The rewriter should only be called when the candidate failed evaluation
        and the identified issues are fixable.
      `.trim(),

      parameters: {
        type: "object",
        required: ["candidate", "issues"],
        properties: {
          candidate: {
            type: "object",
            description: "The candidate output that failed evaluation.",
          },
          issues: {
            type: "array",
            description: "Specific issues identified by the evaluator.",
            items: {
              type: "object",
              required: ["problem"],
              properties: {
                field: {
                  type: "string",
                  description: "The affected field.",
                },
                problem: {
                  type: "string",
                  description: "What is wrong with the candidate.",
                },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
              },
            },
          },
        },
      },
    },
  },
];

// Calling Ollama with a hard timeout
// Retries once if the response is unparsable
export const callLLM = async (userText, { repairHint } = {}) => {
  if (STUB_MODE) return stubResponse(userText);

  const systemPrompt = loadPrompt();

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: repairHint
        ? `Previous attempt failed validation:\n${repairHint}\n\nTry again with this input: ${userText}`
        : `Parse this task: ${userText}`,
    },
  ];

  // Hard timeout - 'Ollama timeout is 10 minutes whcih is not a real timeout'
  const controller = new AbortController();

  // set timeout
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let raw;
  let llmLogs = [];
  let attempts = 0;
  const startedAt = Date.now();

  try {
    let current = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      temperature: 0.2,
      stream: false,
      signal: controller.signal,
    });


    let assistantMessage = current.choices[0].message;
    messages.push(assistantMessage);

    while (assistantMessage?.tool_calls?.length && attempts < MAX_TOOL_ROUNDS) {
      attempts++;
      for (const call of assistantMessage.tool_calls) {
        let result;
        const args = JSON.parse(call.function.arguments || "{}");

        if (call.function.name === "evaluateAndScore") {
          result = evaluateAndScore(args.userRequest, args.candidate);
        } else if (call.function.name === "rewriter") {
          result = rewriter(args.candidate, args.issues);
        } else {
          result = "Unknown tool";
        }

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      // update current — this is what the while condition checks next
      // When tool calling is enabled -> LLM determines data format: remove format
      current = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        temperature: 0.2,
        stream: false,
        signal: controller.signal,
      });

      assistantMessage = current.choices[0].message;
      messages.push(assistantMessage);
    }

    // After while loop — force final JSON response
    messages.push({
      role: "user",
      content:
        "Return only the final candidate as a valid JSON object. No explanation. No text. JSON only.",
    });

    const finalResponse = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.2,
      format: "json", // re-enable format constraint here only
      stream: false,
      signal: controller.signal,
    });

    // Create a logger for LLM costs/usage
    const recordUsage = (response, phase) => {
      const usage = response?.usage;
      const firstLine = loadPrompt().split('\n')[0];
      const version = firstLine.split('-')[1].trim();
      if (!usage) return;

      llmLogs.push({
        phase,
        promptVersion: version,
        model: MODEL,
        inputTokens: Number(usage.prompt_tokens ?? 0),
        outputTokens: Number(usage.completion_tokens ?? 0),
        duration: Date.now() - startedAt,
      });
    };

    raw = finalResponse.choices[0].message.content;

    if (!raw) {
      throw new Error("Ollama returned an empty response");
    }

    console.log("Raw:", raw);

    try {
      // Log LLM usage
      recordUsage(current, "initial");
      console.log("LLM logs: ", llmLogs);

      // return final response parsed.
      return JSON.parse(raw);
    } catch {
      throw new Error(`Model returned invalid JSON: ${raw.slice(0, 100)}`);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`LLM call timed out after ${TIMEOUT_MS}ms`);
    }

    throw err;
  } finally {
    clearTimeout(timer);
  }
};
