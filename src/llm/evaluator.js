import { callLLM } from "./llm.js";

const MAX_ATTEMPTS = 3;
const PASS_THRESHOLD = 0.8;

// Schema validator -> checks shape before trusting content
const validateSchema = (parsed) => {
  const errors = [];

  if (!parsed || typeof parsed !== 'object') {
    return ['parsed output is null or not an object'];
  }

  if (typeof parsed.title !== 'string' || parsed.title.trim === '') {
    errors.push('title must be a non-emtpy string');
  }
  if (parsed.title?.length > 100) {
    errors.push('title exceeds 100 characters');
  }
  if (typeof parsed.done !== 'boolean') {
    errors.push('done must be a boolean value');
  }
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }
  if (!Array.isArray(parsed.warnings)) {
    errors.push('warnings must be an array');
  }

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
  let attempt = 0;  // counter
  let lastReason = null;
  let parsed = null;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;

    try {
      parsed = attempt === 1
        ? await callLLM(text)
        : await rewriter(text, lastReason);
    } catch (err) {
      lastReason = err.message;
      continue;
    }

    // Guard against null/undefined return
    if (!parsed || typeof parsed !== 'object') {
      lastReason = 'LLM returned empty or invalid response';
      continue;
    }

    const evaluation = evaluateAndScore(text, parsed);

    // Check for pass
    if (evaluation.pass) {
      return { success: true, data: parsed, attemps: attempt };
    }

    lastReason = evaluation.reason;

  }

  // Exhaust all attempts
  return {
    success: false,
    attempts: attempt,
    finalScore: parseFloat(parsed?.confidence.toFixed(2)) ?? 0,
    reason: lastReason
  };
};