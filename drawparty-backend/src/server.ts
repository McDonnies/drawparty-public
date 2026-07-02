import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import app from "./app";
import { initializeSocket } from "./socket";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "./types/socket";

dotenv.config();

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(o => o.trim()),
      methods: ["GET", "POST"],
      credentials: true,
    },
  }
);

initializeSocket(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`[server] DrawParty backend running on port ${PORT}`);
});