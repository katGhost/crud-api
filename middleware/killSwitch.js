/* Kill switch -> set LLM_ENABLED=false in the environment to disable
  the /todos/parse endpoint without touching any other route.
  Useful when Ollama is down (most useful with cloud models), costs spike, or you need to disable fast.
*/

export const killSwitch = (req, res, next) => {
  if (process.env.LLM_ENABLED === 'false') {
    return res.status(503).json({
      error: 'LLM feature is currently disabled',
      code: 'LLM_KILL_SWITCH'
    });
  }
  next();
};