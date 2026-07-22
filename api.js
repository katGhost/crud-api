import express from "express";
import swaggerUI from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import todoRoutes from "./routes/todos.js";
import { db } from "./db.js";

// swagger options object
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "CRUD API",
      version: "1.0.0",
      description: "A simple CRUD API made with Express and documented with Swagger",
    },
    servers: [
      {
        url: "http://localhost:3000"
      },
    ],
  },
  apis: ['./routes/*.js'],
  
};

// SwaggerJSDocs config call
const specs = swaggerJSDoc(options);



// create and export express application
export const app = express();

app.use("/docs", swaggerUI.serve, swaggerUI.setup(specs, { explorer: true }));
app.get(specs);

// middleware
app.use(express.json());
app.use("/todos", todoRoutes);

// health status route
app.get("/health", (req, res, next) => {
  res.json({ status: "OK" }).status(200);
})

app.get("/db-health", (req, res, next) => {
  if (db.open === true) {
    res.json({status: "OK"}).status(200)
  } else {
    res.json({status: "Internal Server Error"}).status(500)
  }
})

