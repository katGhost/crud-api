import express from "express";
import { parseWithRetry, validateSchema } from "../llm/evaluator.js";
import { logFailure } from "../../logs/failures.js";
import { killSwitch } from "../../middleware/killSwitch.js";
import { userSchema } from "../llm/schema.js";

/**
 * POST /todos/parse
 * Takes messy free-text, returns a clean validated todo object.
 *
 * Body: { "text": "string" }
 * Success: 200 { title, done, confidence, warnings }
 * Failure: 422 { error, attempts }
 */
const router = express.Router();


router.post("/", killSwitch, async (req, res) => {
  const inputResult = userSchema.safeParse(req.body);

  if (!inputResult.success) {
    const schemaErrors = inputResult.error.issues.map((issue) => issue.message);
    return res.status(400).json({ error: schemaErrors.join("; ") });
  }

  const trimmed = inputResult.data.text.trim();

  // Run orchestration loop
  const result = await parseWithRetry(trimmed);

  if (result.success) {
    return res.status(200).json(result.data);
  }

  // Failure path -> log and return 422
  logFailure({
    input: trimmed,
    attempts: result.attempts,
    finalScore: result.finalScore,
    reason: result.reason,
  });

  return res.status(422).json({
    error: "Could not parse input confidently after maximum attempts",
    attempts: result.attempts,
    reason: result.reason,
  });
});

export default router;
