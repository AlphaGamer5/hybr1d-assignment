import express from "express";
import { handle404 } from "./middlewares/errorHandling/handle404.js";
import { errorHandler } from "./middlewares/errorHandling/errorHandler.middleware.js";
import { auth } from "./middlewares/auth/auth.middleware.js";
import { router as authRouter } from "./routes/auth/auth.route.js";
import { router as buyerRouter } from "./routes/buyer/buyer.route.js";
import { router as sellerRouter } from "./routes/seller/seller.route.js";

const PORT = process.env.PORT || 5000;
const app = express();

// middlewares
app.use(express.json());

// auth
app.use("/api/auth", authRouter);

// buyer route
app.use("/api/buyer", buyerRouter);

// buyer route
app.use("/api/seller", sellerRouter);

app.use("*", handle404);

app.use(errorHandler);

process.on("uncaughtException", (err) => {
  console.log(`Found in uncaughtException: ${err} `);
});

process.on("unhandledRejection", (err) => {
  console.log(`Found in unhandledRejection: ${err} `);
});

process.once("SIGUSR2", function () {
  process.kill(process.pid, "SIGUSR2");
});

export default app;
