import express from "express";
import { parseWithRetry } from "../services/evaluator.js";
import { logFailure } from "../../logs/failures.js";
import { killSwitch } from "../../middleware/killSwitch.js";

/**
 * POST /todos/parse
 * Takes messy free-text, returns a clean validated todo object.
 *
 * Body: { "text": "string" }
 * Success: 200 { title, done, confidence, warnings }
 * Failure: 422 { error, attempts }
 */
const router = express.Router();


router.post('/', killSwitch, async (req, res) => {
  const { text } = req.body;

  // Input validation — reject garbage before spending an LLM call
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string' });
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return res.status(400).json({ error: 'text cannot be empty' });
  }

  if (trimmed.length > 500) {
    return res.status(400).json({ error: 'text must be 500 characters or fewer' });
  }

  // Run orchestration loop
  const result = await parseWithRetry(trimmed);

  if (result.success) {
    return res.status(200).json(result.data);
  }

  // Failure path — log and return 422
  logFailure({
    input: trimmed,
    attempts: result.attempts,
    finalScore: result.finalScore,
    reason: result.reason
  });

  return res.status(422).json({
    error: 'Could not parse input confidently after maximum attempts',
    attempts: result.attempts,
    reason: result.reason
  });
});

export default router;