import dotenv from "dotenv";
import { Worker } from "bullmq";
import nodemailer from "nodemailer";
import { connection } from "./queue";
import { pool } from "./db";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const worker = new Worker(
  "email-queue",
  async (job) => {
    const { emailId } = job.data;

    console.log(`Processing email ${emailId}`);

    const result = await pool.query(
      `SELECT * FROM emails WHERE id = $1`,
      [emailId]
    );

    const email = result.rows[0];

    if (!email) {
      throw new Error("Email not found");
    }

    if (email.status === "sent") {
      console.log(`Email ${emailId} was already sent.`);
      return;
    }

    await pool.query(
      `UPDATE emails SET status = 'processing' WHERE id = $1`,
      [emailId]
    );

    try {
      await transporter.sendMail({
        from: email.sender,
        to: email.recipient,
        subject: email.subject,
        text: email.body,
      });

      await pool.query(
        `
        UPDATE emails
        SET status = 'sent',
            sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [emailId]
      );

      console.log(`✅ Email sent to ${email.recipient}`);
    } catch (error) {
      await pool.query(
        `UPDATE emails SET status = 'failed' WHERE id = $1`,
        [emailId]
      );

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on("completed", (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`❌ Job failed: ${job?.id}`, error.message);
});

console.log("📨 Email worker is running...");