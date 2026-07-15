import express from "express";
import todoRoutes from "./routes/todos.js";


export const app = express();

// middleware
app.use(express.json());
app.use("/", todoRoutes);

// routes -> ToDo List API
/*app.get("/", (req, res, next) => {
  res.json({"message": "Hello, World! I am back at Node.js"});
})*/

/* ====== TODO: ======
  POST -> create a todo: Input
  GET -> render todo(s)
  POST -> delete todo (todo for todo in todos)
  PATCH/PUT -> update todo
======================*/

// render todos
app.get("/", (req, res, next) => {
  res.send("No todos to display")
})

// create a todo
app.post("/todos", (req, res, next) => {
  res.send("Todo created")
})

// find a specific todo
app.get("/todos/:id", (req, res, next) => {
  res.send("Todo found")
})
// delete a todo
app.delete("/todos/:id", (req, res, next) => {
  res.send("Todo deleted")
})

app.patch("/todos/:id", (req, res, next) => {
  res.send("Todo updated")
})
