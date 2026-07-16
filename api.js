import express from "express";
import swaggerUI from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import todoRoutes from "./routes/todos.js";


// swagger options object
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: "CRUD API",
      version: "1.0.0",
      description: "A simple CRUD API"
    },
    servers: [
      {
        url: "http://localhost:3000"
      },
    ],
  },
  apis: ['./routes/*.js'],
  
};

const specs = swaggerJSDoc(options);

export const app = express();

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// middleware
app.use(express.json());
app.use("/todos", todoRoutes);

