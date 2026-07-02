import type { Socket } from "socket.io";
import type { AppServer } from "../index";
import * as garticAIService from "../../services/garticAIService";

export function registerGarticAIHandlers(io: AppServer, socket: Socket): void {
  // ── gartic_ai:submit_canvas ───────────────────────────────────────────────
  // Last active player (or any player in shared mode) submits canvas after time_up.
  // Server is idempotent via canvasSubmitted flag.
  socket.on(
    "gartic_ai:submit_canvas",
    async ({ roomId, canvasBase64 }: { roomId: string; canvasBase64: string }) => {
      try {
        await garticAIService.handleCanvasSubmit(roomId, canvasBase64, io);
      } catch (err) {
        console.error("[gartic_ai:submit_canvas] Error:", err);
      }
    }
  );

  // ── gartic_ai:stroke ──────────────────────────────────────────────────────
  // Relay live strokes to all other players in the room.
  // Frontend enforces turn lock via playerId from gartic_ai:turn_start.
  socket.on(
    "gartic_ai:stroke",
    ({ roomId, strokeData }: { roomId: string; strokeData: unknown }) => {
      try {
        socket.to(roomId).emit("gartic_ai:stroke_received", strokeData as never);
      } catch (err) {
        console.error("[gartic_ai:stroke] Error:", err);
      }
    }
  );
}
