import { db } from "./api.js";

console.log("Database", db);

// Create a new table called 'tasks'
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT 1
  );
`);


// Insert three tasks into the table
const stmt = db.prepare('INSERT INTO tasks (title, done) VALUES(?, ?)');
stmt.run('Read a book', 0);
stmt.run('Work out', 0)
stmt.run('Buy snacks at the mall', 0);

console.log("Data insertion success!")

// 
