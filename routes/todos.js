import express from "express";
import { v4 as uuidv4 } from "uuid";

// create a user router
const router = express.Router();  // create a fresh router instance

// mock todos database
let todos = [];

/* ====== TODO: ======
  POST -> create a todo: Input
  GET -> render todo(s)
  POST -> delete todo (todo for todo in todos)
  PATCH/PUT -> update todo
======================*/
// GET: getting a list of todos from the mock db
router.get("/", (req, res, next) => {
  res.send(todos);
})

// POST: creating todos
router.post("/", (req, res, next) => {
  try { 
    const todo = req.body;

    todos.push({ ...todo, id: uuidv4() });
    res.send(`${todo.title} has been added to the database!`);
  } catch (error) {
    res.status(500).send(error)
  }
})

// GET: get specific todo
router.get("/:id", (req, res, next) => {
    const { id } = req.params;

    const todoFound = todos.find((todo) => todo.id === id);
    res.send(todoFound);
})

// PATCH: update a todo
router.patch("/:id", (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, done } = req.body;

    const todoUpdate = todos.find((todo) => todo.id === id);

    if (title) todoUpdate.title = title;
    if (done) todoUpdate.done = done;

    res.send(`${todoUpdate.id} has been updated!`);
  } catch (error) {
    res.status(500).send(error);
  }
})

// DELETE: remove a specific todo
router.delete("/:id", (req, res, next) => {
  const { id } = req.params;
  todos = todos.filter((todo) => todo.id !== id);
  res.send(`${id} has been deleted!`).status(200)
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

