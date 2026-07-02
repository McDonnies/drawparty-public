import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const isLocal = BACKEND_URL.includes("localhost");

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  isLocal ? BACKEND_URL : "https://mai-projet-integrateur.u-strasbg.fr",
  {
    path: isLocal ? "/socket.io" : "/vmProjetIntegrateurgrp13-0/socket.io",
    autoConnect: false,
    transports: ["websocket", "polling"],
  }
);
