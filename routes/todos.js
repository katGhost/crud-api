import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db.js";
/**
 * @swagger
 * components:
 *   schemas:
 *     Todo:
 *       type: object
 *       required:
 *         - title
 *         - done
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the todo
 *         title:
 *           type: string
 *           description: The title of your todo
 *         done:
 *           type: integer
 *           description: Whether you have done the todo [0 = false, 1 = true]
 *       example:
 *         id: 1
 *         title: Cleaning out my closet
 *         done: 0
 */

/**
 * @swagger
 * tags:
 *   name: Todos
 *   description: Small API for todos also known as tasks
 * /todos:
 *   get:
 *     summary: List all todos
 *     tags: [Todos]
 *     responses:
 *       200:
 *         description: A list of all the todos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Todo'
 *   post:
 *     summary: Create a new todo
 *     tags: [Todos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Todo'
 *     responses:
 *       200:
 *         description: Todo created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       500:
 *         description: Some server error
 * /todos/{id}:
 *   get:
 *     summary: Get a specific todo by its ID
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Todo id
 *     responses:
 *       200:
 *         description: Found a todo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       404:
 *         description: Todo not found
 *   patch:
 *     summary: Update a specific todo by its ID partialy
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Todo id
 *     requestBody:
 *       required: true
 *       content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *     responses:
 *       200:
 *         description: Todo updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Todo'
 *       404:
 *         description: Todo not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a specific todo
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Todo id
 *     responses:
 *       200:
 *         description: Todo deleted
 *       404:
 *         description: Todo not found
 * 
 * 
 *
 */

// create a user router
const router = express.Router();  // create a fresh router instance


// GET: getting a list of todos from the real db
router.get("/", (req, res, next) => {
  // retunr all the todos in the tasks table in todo.db
  const todos = db.prepare('SELECT * FROM tasks').all();
  res.json(todos);
})

// POST: creating todos
router.post("/", (req, res, next) => {
  try { 
    const { title, done } = req.body;
    // validate request body -> if title is missing or empty
    if (!title || typeof title !== 'string' || title.trim().length === 0 || typeof done !== 'number') {
      return res.status(400).json({ error: 'Please enter a todo to create' });
    }

    const query = db.prepare("INSERT INTO tasks (title, done) VALUES(?, ?)");
    const newTodo = query.run(title, done);
    
    // select that todo
    const getTodo = db.prepare("SELECT id, title, done FROM tasks WHERE id = ?");
    const todo = getTodo.get(newTodo.lastInsertRowid);
    console.log(todo);

    res.status(201).json({ message: `${todo.title} has been created!`});
  } catch (error) {
    res.status(500).json(error)
  }
    /* {
        title: todo.title.trim(),
        done: typeof todo.done === 'int' ? todo.done : 0,
      };
    */
})

// GET: get specific todo
router.get("/:id", (req, res, next) => {
    const { id } = req.params;

    const query = db.prepare("SELECT * FROM tasks WHERE id = ?");
    const getTodo = query.get(id);
    if (getTodo) {
      res.status(200).json(getTodo);
    } else {
      res.status(404).json({error: `Todo ${id} not found!`});
    }
})

// PATCH: update a todo
router.patch("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, done } = req.body;

    // point to where the update must happen in the database and apply change to be made
    const query = db.prepare(`UPDATE tasks SET title = ?, done = ? WHERE id = ?`);
    const update = query.run(title, done, id);

    // return applied changes
    const getTodo = db.prepare("SELECT id, title, done FROM tasks WHERE id = ?"); 
    const updatedTodo = getTodo.get(update.changes)
    // console.log("Updated Todo:", updateTodo);

    if (title) updatedTodo.title = title;
    if (done) updatedTodo.done = done;

    res.status(200).json(`${updatedTodo.title} has been updated!`);
  } catch (error) {
    res.status(500).json(error);
  }
})

// DELETE: remove a specific todo
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;
  const index = db.prepare("DELETE FROM tasks WHERE id = ?");
  const deleted = index.run(id)
  // if todo not found, retunr 404 error
  if (index === -1) return res.status(404).json({ message: 'Todo not found' });

  // delete that specific todo
  return res.status(200).json({ message: `${id} has been deleted!` });
})

export default router;


/*  {
    title: "Buy groceres",
    done: false,
    created_at: new Date(),
  },
  {
    title: "Clean the house",
    done: false,
    created_at: new Date(),
  },
*/

