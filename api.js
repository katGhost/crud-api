import express from "express";
import todoRoutes from "./routes/todos.js";

export const app = express();

// middleware
app.use(express.json());
app.use("/todos", todoRoutes);

// test route
/*app.get("/", (req, res, next) => {
  res.json({"message": "Hello, World! I am back at Node.js"});
})*/
