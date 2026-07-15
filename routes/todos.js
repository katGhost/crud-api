import express from "express";

// create a user router
const router = express.Router();  // create a fresh router instance

// mock todos database
const todos = [
  {
    title: "Buy groceres",
    done: false,
    created_at: new Date(),
  },
  {
    title: "Clean the house",
    done: false,
    created_at: new Date(),
  },
];


// getting a list of todos from the mock db
router.get("/", (req, res, next) => {
  res.send(todos);
})

export default router;

