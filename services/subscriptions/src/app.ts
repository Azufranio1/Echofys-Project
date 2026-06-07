import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db";
import { connectRedis } from "./lib/redis";
import routes from "./routes/subscriptionRoutes";

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/qr", express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => {
  res.json({ service: "echofy-subscriptions", status: "ok" });
});

app.use("/", routes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[subscriptions] Error:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

const start = async () => {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => console.log(`[subscriptions] Corriendo en puerto ${PORT}`));
};

start();