import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./lib/db";
import { connectRedis } from "./lib/redis";
import lyricsRoutes from "./routes/lyricsRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ service: "echofy-lyrics", status: "ok" });
});

app.use("/lyrics", lyricsRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[lyrics] Error:", err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

const start = async () => {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => console.log(`[lyrics] Corriendo en puerto ${PORT}`));
};

start();