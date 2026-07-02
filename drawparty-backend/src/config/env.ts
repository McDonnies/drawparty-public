import dotenv from "dotenv";
dotenv.config();

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  PORT: process.env.PORT || "3001",
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: getEnv("DATABASE_URL"),
  CLERK_SECRET_KEY: getEnv("CLERK_SECRET_KEY"),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};