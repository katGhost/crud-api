import { callLLM } from "./llm.js";
import { schema } from "./schema.js";
import OpenAI from "openai";


const MAX_ATTEMPTS = 3;
const PASS_THRESHOLD = 0.75;

// Schema validator -> checks shape before trusting content

export const validateSchema = (parsed) => {
  const errors = [];

  // Validate using zod -> switch from pain JS validation

  if (!parsed || typeof parsed !== 'object') {
    return ['parsed output is null or not an object'];
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    errors.push(...result.error.issues.map((issue) => issue.message));
  }

  // if (typeof parsed.title !== 'string' || parsed.title.trim() === '') {
  //   errors.push('title must be a non-empty string');
  // }
  // if (parsed.title?.length > 100) {
  //   errors.push('title exceeds 100 characters');
  // }
  // if (typeof parsed.done !== 'boolean') {
  //   errors.push('done must be a boolean value');
  // }
  // if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
  //   errors.push('confidence must be a number between 0 and 1');
  // }
  // if (!Array.isArray(parsed.warnings)) {
  //   errors.push('warnings must be an array');
  // }

  return errors;
}

// evaluate_and_score tool
// Checks schema first then trusts the model's confidence score.
export const evaluateAndScore = (userRequest, candidate) => {
  const schemaErrors = validateSchema(candidate);

  if (schemaErrors.length > 0) {
    return { pass: false, score: 0, reason: schemaErrors.join('; ') };
  }

  const pass = candidate.confidence >= PASS_THRESHOLD;
  return {
    pass,
    score: parseFloat(candidate.confidence.toFixed(2)),
    reason: pass 
      ? 'Passed threshold' 
      : `Confidence ${candidate.confidence} below threshold ${PASS_THRESHOLD}`
  };
};


// rewriter tool -> LLM 
// Hands the model its own failure resason and asks it to try again -> draft better output
export const rewriter = async (candidate, issues) => {
  const failureReason = JSON.stringify(issues);
  const text = JSON.stringify(candidate);
  return callLLM(text, { repairHint: failureReason });
};

// Orchestration loop -> bounded at MAX_ATTEMPS
export const parseWithRetry = async (text) => {
  let attempt = 0;
  let lastReason = null;
  let parsed = null;

  const RETRYABLE = [429, 500, 502, 503, 504];

  while (attempt < MAX_ATTEMPTS) {
    attempt++;

    try {
      parsed = attempt === 1
        ? await callLLM(text)
        : await callLLM(text, { repairHint: lastReason });

    } catch (err) {
      const isAPIError = err instanceof OpenAI.APIError || err instanceof OpenAI.APIConnectionError;

      if (isAPIError && !RETRYABLE.includes(err.status)) {
        throw err; // 400, 401, 403 -> fail immediately, no retry
      }

      lastReason = err.message;

      // Backoff -> 1s, 2s, 4s + jitter
      const delay = (2 ** (attempt - 1)) * 1000 + Math.random() * 500;
      await new Promise(res => setTimeout(res, delay));
      continue;
    }

    // Guard against empty/invalid return
    if (!parsed || typeof parsed !== 'object') {
      lastReason = 'LLM returned empty or invalid response';
      continue;
    }

    const evaluation = evaluateAndScore(text, parsed);

    if (evaluation.pass) {
      return { success: true, data: parsed, attempts: attempt };
    }

    lastReason = evaluation.reason;
  }

  // exhaust all attempts
  return {
    success: false,
    attempts: attempt,
    finalScore: parseFloat(parsed?.confidence?.toFixed(2)) ?? 0,
    reason: lastReason
  };
};