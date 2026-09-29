import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("email-queue", {
  connection,
});