import express from "express";
import { v4 as uuidv4 } from "uuid";
import * as todoRepository from "../repositories/todoRepository.js";
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
 *           type: boolean
 *           description: Whether you have done the todo [false || true]
 *       example:
 *         id: 1
 *         title: Cleaning out my closet
 *         done: false
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
 *       201:
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
router.get("/", async (req, res, next) => {
  // retunr all the todos in the tasks table in todo.db
  try {
    const todos = await todoRepository.getAllTodos(req.query);
    res.json(todos);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "Internal server error"});
  }
})

// POST: creating todos
router.post("/", async (req, res, next) => {
  try { 
    const { title, done } = req.body;
    // validate request body -> if title is missing or empty
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter a todo to create' });
    }

    const created = await todoRepository.createTodo({title, done});
    
    // select that todo
    if (!created) {
      return res.status(404).json({error: 'Not found'})
    }

    res.status(201).json({ message: `${created.title} has been created!`});
  } catch (error) {
    res.status(500).json({error: error.message})
  }
    /* {
        title: todo.title.trim(),
        done: typeof todo.done === 'int' ? todo.done : 0,
      };
    */
})

// GET: get specific todo
router.get("/:id", async (req, res, next) => {
  const { id } = req.params;

  try {
    const getTodo = await todoRepository.getTodoById(id);
    if (!getTodo) return res.status(404).json(`Could not find todo ${id}`);
    res.status(200).json(getTodo);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "Internal server error"});
  }
})

// PATCH: update a todo
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, done } = req.body;

    const updatedTodo = await todoRepository.updateTodo(id, {title, done});

    if (!updatedTodo) res.status(404).json({error: "Todo not found"});
    res.status(200).json(`${updatedTodo.title} has been updated!`);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
})

// DELETE: remove a specific todo
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await todoRepository.deleteTodo(id);

    if (!deleted) return res.status(404).json({error: "Todo not found"});
    res.status(200).json({message: `${deleted.title} has been deleted`});
  } catch (error) {
    console.error(error);
    res.status(500).json({error: error.message})
  }
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

  // search and append conditions dynamically
  // if (search) {
  //   conditions.push("title LIKE ?");
  //   params.push(`%${search}%`);
  // }

  // if (done) {
  //   conditions.push("done = ?");
  //   params.push(done === "true" ? 1 : 0);
  // }

  // let baseQuery = "SELECT * FROM tasks";
  // if (conditions.length > 0) {
  //   baseQuery += " WHERE " + conditions.join(" AND ");
  // }
*/

