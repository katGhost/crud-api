import fs from "node:fs";
import readline from "node:readline";


const fileStream = fs.createReadStream('./evals/cases.jsonl');

export const readEvalCases = async () => {
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const records = [];

  // Read each line of the JSONL file and parse it into an object
  // call the /parse route wiht the lines -> compare
  try {
    for await (const line of rl) {
      if (!line.trim()) continue; // skip empty lines

      const json = JSON.parse(line);
      records.push(json);
    }

    // return records
    console.log(`Records: ${JSON.stringify(records)}`);
    return records;

  } catch (error) {
    console.error('Error reading eval cases:', error.message);
  }

}

// readEvalCases();


// Run evals
export const runEvals = async (records) => {
  let passCount = 0;

  // Pass records to the '/parse' route and compare for scoring
  for (let record of records) {
    const response = await fetch('http://localhost:3000/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: record.input }),
      signal: AbortSignal.timeout(7_200_000) // 2 minutes timeout
    });

    const data = await response.json();

    // compare evals data with LLMs' expected output -> done and confidence
    const expected = record.expected;
    const actual = data;

    // Measure a pass by matching the actual with expected output
    const pass = actual.done === expected.done && Math.abs(actual.confidence - expected.confidence) <= 0.1;

    // Create a score based on pass count (e.g., 6/8)
    if (pass) passCount++;

    // Log the result of each eval case
    console.log(`Input: ${record.input}`);
    console.log(`Expected: ${JSON.stringify(expected)}`);
    console.log(`Actual: ${JSON.stringify(actual)}`);
    console.log(`Pass: ${pass}`);
    console.log('-------------------------');

  }

  // Score
  console.log(`Score: ${passCount} / ${records.length}`)
}

const records = await readEvalCases();
runEvals(records);