# CRUD API — Todo List + LLM Parser

A small Express.js CRUD API built as part of my 8-week portfolio track. Backend AI Engineer Intern project focused on REST fundamentals, route architecture, repository pattern, containerized deployments, and putting an LLM behind an API endpoint.

## Stack

- Node.js + Express 5
- pnpm
- PostgreSQL + `pg` (node-postgres)
- Docker + Docker Compose
- Ollama (`llama3.2:latest`) — local LLM via OpenAI-compatible client
- swagger-jsdoc + swagger-ui-express (interactive API docs)
- nodemon — automatic server restarts

## Project Structure

```text
CRUD-API/
├── api.js                  # Express app instance, middleware, route mounting
├── server.js               # Entry point → imports app, calls app.listen()
├── db/
│   └── pool.js             # pg connection pool (reads from DATABASE_URL)
├── repository/
│   └── todoRepository.js   # All SQL queries (getAllTodos, getTodoById, createTodo, updateTodo, deleteTodo)
├── routes/
│   ├── todos.js            # Router for all /todos endpoints
│   └── parse.js            # POST /parse — LLM todo parser
├── prompts/
│   └── parse-todo-v1.txt   # Versioned system prompt
├── evals/
│   ├── cases.jsonl         # 8 hand-labelled eval cases
│   └── score.js            # Scoring script
├── init.sql                # Schema definition — runs once on Postgres container init
├── docker-compose.yml      # api + db services, volume, networking
├── .env.example            # Required env vars (copy to .env — never commit .env)
├── package.json
```

**Why the split?** `api.js` builds the app (middleware + routes); `server.js` only starts it. This keeps `app` importable in tests without spinning up a live server.

**Why a repository layer?** Routes call repo functions directly — no service layer yet since the app logic doesn't warrant one. The repo layer keeps SQL out of route handlers and makes the DB swappable without touching routes.

---

## POST /parse — LLM Todo Parser

You send a plain English sentence describing a task. The endpoint runs it through a local LLM and returns a structured todo object — a title, whether the task is already done, a confidence score between 0 and 1, and any warnings the model flagged. No external API key needed — the model runs locally via Ollama.

### Try It

```bash
curl -X POST http://localhost:3000/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "remind sarah finish the thing before eod"}'
```

**Response:**

```json
{
  "title": "remind sarah to finish the task before eod",
  "done": false,
  "confidence": 1,
  "warnings": []
}
```

### Job Card

**It must always:**
- Return valid JSON matching the todo schema (`title`, `done`, `confidence`, `warnings`)
- Include a `confidence` score between 0 and 1
- Reject empty or missing `text` with a 400
- Retry on transient LLM errors (429, 500, 502, 503, 504) with exponential backoff

**It must never:**
- Call the LLM when `LLM_ENABLED=false`
- Crash the server on a bad or empty LLM response
- Return a 2xx when the output fails schema validation
- Expose raw LLM errors to the client

---

## Model & Provider

| Field    | Value               |
|----------|---------------------|
| Provider | Ollama (local)      |
| Model    | `llama3.2:latest`   |

**Three env vars to swap providers:**

| Variable       | Description                      | Example                     |
|----------------|----------------------------------|-----------------------------|
| `LLM_URL`      | OpenAI-compatible base URL       | `http://localhost:11434/v1` |
| `OPENAI_API_KEY` | API key (`ollama` for local)   | `ollama`                    |
| `LLM_MODEL`    | Model name                       | `llama3.2:latest`           |

---

## Eval Results

> Prompt version: v1 — Date: 2026-10-05

Scored against 8 hand-labelled cases in `evals/cases.jsonl`.  
Scoring: `done` exact match, `confidence` within ±0.1 threshold.

**Result: 0 / 8**

The scorer completed 2 cases before hitting connection timeouts. Both failed on `confidence` — the model returned `0.0` on every attempt instead of a meaningful score. Root causes:

- `llama3.2:latest` running locally on 12GB RAM — inference averaged 2–5 minutes per call
- `LLM_TIMEOUT` parsed as `NaN` due to numeric separator in `.env` (`1_800_000` → fixed to `1800000`)
- `confidence` generation is a prompt issue — the model never scored above `0.0` regardless of input

A real `0 / 8` is more useful than an invented score — it sets a baseline. Fix the prompt, re-run, compare.

---

## Cost Log — One Call

```json
{
  "phase": "initial",
  "promptVersion": "version: 1",
  "model": "llama3.2:latest",
  "inputTokens": 580,
  "outputTokens": 90,
  "durationMs": 300551
}
```

**Estimate at 10,000 requests/day (local Ollama):**  
~620 input + ~60 output = ~680 tokens per call.  
10,000 calls × 680 tokens = ~6.8M tokens/day.  
Ollama runs on your own hardware — no per-token cost.  
Cloud equivalent (GPT-4o-mini at $0.15/1M input + $0.60/1M output): **~$1.47/day**.

---

## What I'd Fix With Another Day

The `confidence` field returned `0.0` on every eval case — the prompt doesn't give the model enough guidance on how to score it. I'd add 3–4 few-shot examples showing low, medium, and high confidence inputs with reasoning, re-run the eval, and use the `0 / 8` baseline to measure whether it actually helped.

---

## CRUD Endpoints

| Method | Path          | Description                                               |
|--------|---------------|-----------------------------------------------------------|
| GET    | `/todos`      | List all todos (supports `?search=` and `?done=` filters) |
| POST   | `/todos`      | Create a new todo                                         |
| GET    | `/todos/:id`  | View a specific todo                                      |
| PATCH  | `/todos/:id`  | Update an existing todo                                   |
| DELETE | `/todos/:id`  | Delete a todo                                             |
| POST   | `/parse`      | Parse free-text into a structured todo via LLM            |
| GET    | `/health`     | Server health check                                       |

## API Docs (Swagger UI)

```bash
http://localhost:3000/docs
```

Generated via `swagger-jsdoc` from inline JSDoc comments. Full CRUD cycle can be run directly from the "Try it out" UI — no curl needed.

## Screenshots

![SwaggerUI](./screenshot.png)

![Database Viewer DB Browser](./db-viewer.png)

---

## Getting Started

### With Docker (recommended)

```bash
cp .env.example .env        # fill in values — do not commit .env
docker compose up --build
```

API runs at `http://localhost:3000`.

> ⚠️ Ollama must be running separately on your host machine. The container reaches it via `host.docker.internal`.

### Without Docker (local Postgres + Ollama required)

```bash
pnpm install
# set DATABASE_URL in .env to point at your local Postgres instance
pnpm start
```

### Run Evals

```bash
# Server must be running first
node evals/score.js
```

---

## Environment Variables

| Variable         | Description                          | Example                                 |
|------------------|--------------------------------------|-----------------------------------------|
| `DATABASE_URL`   | Postgres connection string           | `postgresql://user:pass@db:5432/tododb` |
| `PORT`           | Port the API listens on              | `3000`                                  |
| `LLM_URL`        | Ollama base URL                      | `http://localhost:11434/v1`             |
| `LLM_MODEL`      | Model to use                         | `llama3.2:latest`                       |
| `LLM_TIMEOUT`    | Timeout in ms (no underscores)       | `1800000`                               |
| `LLM_ENABLED`    | Kill switch — set false to block LLM | `true`                                  |
| `LLM_STUB`       | Return hardcoded response            | `false`                                 |
| `OPENAI_API_KEY` | API key for Ollama client            | `ollama`                                |

---

## Example Queries

```bash
# Get all todos
curl http://localhost:3000/todos

# Filter by search term and status
curl "http://localhost:3000/todos?search=groceries&done=false"

# Create a todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries"}'

# Update a todo
curl -X PATCH http://localhost:3000/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Buy groceries at the mall", "done": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/todos/1

# Parse free-text into a todo
curl -X POST http://localhost:3000/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "remind sarah finish the thing before eod"}'
```

---

## Notes / Learnings

- Route mounting gotcha: mounting a router at `/todos` and defining routes inside as `/todos` again produces `/todos/todos`. Router paths are relative to the mount point.
- `const` prevents reassigning a variable, not mutating its contents — `.push()` works fine on a `const` array; `.filter()` reassignment does not.
- Health checks belong at the app level (`api.js`), not inside a resource-scoped router.
- Postgres uses positional placeholders (`$1, $2`) unlike SQLite's `?` — numbers must be derived dynamically when building conditional queries.
- `DEFAULT FALSE` on a `BOOLEAN` column only fires when the column is omitted from `INSERT` entirely — passing `null` explicitly still violates `NOT NULL`.
- Docker's `init.sql` only runs on a fresh volume — schema changes require `docker compose down -v`.
- `EAI_AGAIN db` errors mean the API container can't resolve the DB hostname — verify `DATABASE_URL` matches the service name in `docker-compose.yml`.
- Zod input schema and output schema are two different jobs — one validates the user's request body, the other validates the LLM's response.
- Numeric separators (`1_800_000`) don't survive `Number(process.env.X)` — always write raw numbers in `.env`.
- `for...in` loops over keys; `for...of` loops over values — use `for...of` on arrays.

---

## Author

Andries — Backend AI Engineer Intern @ FlyRank, CS50 AI student.
