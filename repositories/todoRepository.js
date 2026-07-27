import pool from "../db/pool.js";


export async function getAllTodos(filters = {}) {
  let baseQuery = "SELECT * FROM tasks";
  const conditions = [];
  const params = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`title LIKE $${params.length}`);
  }

  if (filters.done !== undefined) {
    params.push(filters.done === "true" ? 1 : 0);
    conditions.push(`done = $${params.length}`);
  }

  if (conditions.length > 0) {
    baseQuery += ` WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`;
  }

  const result = await pool.query(baseQuery, params);
  return result.rows;
}

export async function getTodoById(id) {
  const result = await pool.query(`
    SELECT * FROM tasks
    WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

export async function createTodo({ title, done }) {
  const columns = ["title"];
  const params = [title];

  if (done !== undefined) {
    columns.push("done");
    params.push(done);
  }

  const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");

  const result = await pool.query(
    `INSERT INTO tasks(${columns.join(", ")})
     VALUES(${placeholders})
     RETURNING *`,
    params
  );

  return result.rows[0];
}

export async function updateTodo(id, { title, done }) {
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push(`title = $${params.length + 1}`);
    params.push(title);
  }

  if (done !== undefined) {
    updates.push(`done = $${params.length + 1}`);
    params.push(done);
  }

  if (updates.length === 0) {
    throw new Error("No fields provided to update.");
  }

  updates.push(`updated_at = NOW()`);

  params.push(id);

  const result = await pool.query(
    `
    UPDATE tasks
    SET ${updates.join(", ")}
    WHERE id = $${params.length}
    RETURNING *
    `,
    params
  );

  return result.rows[0];
}

export async function deleteTodo(id) {
  const result = await pool.query(`
    DELETE FROM tasks
    WHERE id = $1
    RETURNING *`,
    [id]);
}