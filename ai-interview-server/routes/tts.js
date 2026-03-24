import express from "express";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const router = express.Router();

router.post("/", (req, res) => {
  const { text } = req.body;

  const safeText = text.replace(/"/g, '\\"');
  const filename = `speech-${Date.now()}.mp3`;
  const filepath = path.join(process.cwd(), filename);
const command = `edge-tts --voice-name en-US-JennyNeural --text "${safeText}" --write-media "${filepath}"`;

  exec(command, (error) => {
    if (error) {
      console.error("TTS ERROR:", error);
      return res.status(500).json({ error: "TTS failed" });
    }

    const audio = fs.readFileSync(filepath);
    fs.unlinkSync(filepath);

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audio);
  });
});

export default router;