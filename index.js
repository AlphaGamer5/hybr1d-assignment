import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { mongoDb } from "./connectors/db/index.js";

(async () => {
  try {
    if (!process.env.PORT) {
      throw new Error("No port specified. please specify the port.");
    }

    const PORT = process.env.PORT;

    await mongoDb.connect();

    console.log("connected to mongodb....");

    app.listen(PORT, () => {
      console.log(`server started at port: ${PORT}.`);
    });
  } catch (error) {
    console.log(error);
  }
})();
