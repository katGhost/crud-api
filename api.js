import express from "express";
export const app = express();

// middleware
app.use(express.json());

// routes -> ToDo List API
app.get("/", (req, res, next) => {
  res.json({"message": "Hello, World! I am back at Node.js"});
})

/*
  POST -> create a todo: Input
  GET -> render todo(s)
  POST -> delete todo (todo for todo in todos)
  PATCH/PUT -> update todo
*/
