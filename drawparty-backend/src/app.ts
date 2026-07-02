import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/users";
import roomRoutes from "./routes/rooms";
import friendsRouter from "./routes/friends";
import { requireAuth } from "./middleware/authMiddleware";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "DrawParty server running" });
});

app.use("/users",   userRoutes);
app.use("/rooms",   roomRoutes);
app.use("/friends", requireAuth, friendsRouter);

app.use(errorHandler); // must be last

export default app;