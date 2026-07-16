import express from "express";
import { v4 as uuidv4 } from "uuid";
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
 *           description: The auto-generated uuid id of the todo
 *         title:
 *           type: string
 *           description: The title of your todo
 *         done:
 *           type: boolean
 *           description: Whether you have done the todo
 *       example:
 *         id: d3b93279-9992-4015-adca-cac651f5b40a
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
 *     summary: Get a specific todo by its uuid4 ID
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
 *     summary: Update a specific todo by its uuid4 ID partialy
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

// mock todos database
const todos = [
  {
    id: uuidv4(),
    title: "Clean the house",
    done: false,
  },
  {
    id: uuidv4(),
    title: "Read a book",
    done: false,
  },
  {
    id: uuidv4(),
    title: "Work out",
    done: false,
  }
];

// GET: getting a list of todos from the mock db
router.get("/", (req, res, next) => {
  res.json(todos);
})

// POST: creating todos
router.post("/", (req, res, next) => {
  try { 
    const todo = req.body;
    // validate request body -> if title is missing or empty
    if (!todo || typeof todo.title !== 'string' || todo.title.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter a todo to create' });
    }

    const newTodo = {
      id: uuidv4(),
      title: todo.title.trim(),
      done: typeof todo.done === 'boolean' ? todo.done : false,
    };

    todos.push(newTodo);
    res.status(201).json({ message: `${newTodo.title} has been created!`, todo: newTodo });
  } catch (error) {
    res.status(500).json(error)
  }
})

// GET: get specific todo
router.get("/:id", (req, res, next) => {
    const { id } = req.params;

    const todoFound = todos.find((todo) => todo.id === id);
    if (todoFound) {
      res.status(200).json(todoFound);
    } else {
      res.status(404).json({error: `Todo ${id} not found!`});
    }
})

// PATCH: update a todo
router.patch("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, done } = req.body;

    const todoUpdate = todos.find((todo) => todo.id === id);

    if (title) todoUpdate.title = title;
    if (done) todoUpdate.done = done;

    res.status(200).json(`${todoUpdate.id} has been updated!`);
  } catch (error) {
    res.status(500).json(error);
  }
})

// DELETE: remove a specific todo
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;
  const index = todos.findIndex((todo) => todo.id === id);
  // if todo not found, retunr 404 error
  if (index === -1) return res.status(404).json({ message: 'Todo not found' });   // <- copilot assisted

  // delete that specific todo
  todos.splice(index, 1);
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

