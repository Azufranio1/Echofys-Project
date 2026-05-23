import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { getLyrics, fetchAndSaveLyrics, upsertLyrics, deleteLyrics, getSyncedLines } from "../controllers/lyricsController";

const router = Router();

router.use(authMiddleware);

router.get("/:songId",        getLyrics);
router.get("/:songId/synced", getSyncedLines);
router.post("/:songId/fetch", fetchAndSaveLyrics);
router.put("/:songId",        upsertLyrics);
router.delete("/:songId",     deleteLyrics);

export default router;