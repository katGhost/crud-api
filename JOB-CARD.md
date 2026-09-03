# LLM Job Card

## What it does

Parses a messy free-text task description into a clean, validated todo object.

### Input

```JSON
{ "text": "string, 1–500 characters" }
```

### Output

```JSON
{
  "title": "string",
  "done": false,
  "confidence": 0.0–1.0,
  "warnings": ["string"]
}
```

### It must never

- Invent fields outside the schema
- Return raw model text
- Set `done: true` unless explicitly stated in input

### When unsure

- Return lowest failing confidence score with a warning
- Never guess — flag it.
