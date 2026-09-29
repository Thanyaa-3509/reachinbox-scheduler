import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { emailQueue } from "./queue";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "ReachInbox Scheduler API is running 🚀",
  });
});

app.post("/api/emails/schedule", async (req, res) => {
  try {
    const {
      recipient,
      sender,
      subject,
      body,
      scheduledAt,
    } = req.body;

    if (!recipient || !sender || !subject || !body || !scheduledAt) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const id = randomUUID();

    const scheduledTime = new Date(scheduledAt);

    const delay = Math.max(
      0,
      scheduledTime.getTime() - Date.now()
    );

    await pool.query(
      `
      INSERT INTO emails
      (id, recipient, sender, subject, body, scheduled_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        id,
        recipient,
        sender,
        subject,
        body,
        scheduledTime,
      ]
    );

    await emailQueue.add(
      "send-email",
      {
        emailId: id,
      },
      {
        jobId: id,
        delay,
        removeOnComplete: false,
      }
    );

    res.json({
      success: true,
      id,
      message: "Email scheduled successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to schedule email",
    });
  }
});

app.get("/api/emails", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM emails ORDER BY scheduled_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch emails",
    });
  }
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});