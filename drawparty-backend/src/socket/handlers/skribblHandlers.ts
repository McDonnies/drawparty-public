import type { Socket } from "socket.io";
import type { AppServer } from "../index";
import * as skribblService from "../../services/skribblService";
import * as aiService from "../../services/aiService";
import { prisma } from "../../config/prisma";

/**
 * Registers all Skribbl gameplay socket event listeners on a socket connection.
 * Add this call in socket/index.ts alongside registerRoomHandlers and registerGarticHandlers.
 *
 * @param io     - The Socket.io Server instance
 * @param socket - The authenticated client socket (socket.data.userId is already set)
 */
export function registerSkribblHandlers(io: AppServer, socket: Socket): void {

  // ── skribbl:choose_word ───────────────────────────────────────────────────
  // Drawer picks one of the 3 offered words during PICKING_WORD phase.
  // wordIndex is 0-indexed — service will clamp it to valid range.
  // Non-drawer clients MUST NOT emit this; silently ignored by the service if they do.
  socket.on("skribbl:choose_word", async ({ roomId, wordIndex }: { roomId: string; wordIndex: number }) => {
    try {
      if (!roomId || typeof wordIndex !== "number") return;
      await skribblService.chooseWord(roomId, socket.data.userId, wordIndex, io);
    } catch (err) {
      console.error("[skribbl:choose_word] Error:", err);
    }
  });

  // ── skribbl:submit_guess ──────────────────────────────────────────────────
  // Guesser submits a text guess during the DRAWING phase.
  // Drawer MUST NOT emit this — the service validates and silently ignores if they do.
  // Once a player has guessed correctly this round, subsequent guesses are ignored (idempotent).
  socket.on("skribbl:submit_guess", async ({ roomId, guess }: { roomId: string; guess: string }) => {
    try {
      if (!roomId || typeof guess !== "string" || guess.trim() === "") return;
      await skribblService.submitGuess(roomId, socket.data.userId, guess, io);
    } catch (err) {
      console.error("[skribbl:submit_guess] Error:", err);
    }
  });

  // ── skribbl:submit_drawing ────────────────────────────────────────────────
  // Drawer submits the final canvas image (base64 PNG) when the round ends.
  // Saved to SkribblRound.drawingUrl so it appears on the results page.
  // Non-drawer clients and duplicate submissions are silently ignored.
  socket.on("skribbl:submit_drawing", async ({ roomId, imageBase64 }: { roomId: string; imageBase64: string }) => {
    try {
      if (!roomId || !imageBase64 || typeof imageBase64 !== "string") return;

      const userId = socket.data.userId;

      // Find the active game (exclude WAITING/FINISHED)
      const game = await prisma.skribblGame.findFirst({
        where: { roomId, phaseId: { notIn: ["WAITING", "FINISHED"] } },
        include: { rounds: { orderBy: { roundNumber: "desc" }, take: 1 } },
      });
      if (!game) return;

      const round = game.rounds[0];
      if (!round) return;

      // Only the drawer for this round can submit — checked against round.drawerId
      if (round.drawerId !== userId) return;

      // Idempotency: skip if already saved
      if (round.drawingUrl) return;

      await prisma.skribblRound.update({
        where: { id: round.id },
        data: { drawingUrl: imageBase64 },
      });
    } catch (err) {
      console.error("[skribbl:submit_drawing] Error:", err);
    }
  });

  // ── skribbl:stroke ────────────────────────────────────────────────────────
  // Drawer emits a live stroke for real-time relay to guessers.
  // This is a relay-only event — NO database write occurs here.
  // Non-drawer clients MUST NOT emit this; add a drawer identity check below.
  //
  // Client throttle: the frontend should throttle stroke emission to ≤60fps.
  // Reference: garticHandlers.ts → gartic:stroke (identical relay pattern)
  // Apply on guesser side: useFabricCanvas.applyRemoteStroke() or canvasUtils.applyRemoteStroke()
  socket.on("skribbl:stroke", ({ roomId, stroke }: { roomId: string; stroke: any }) => {
    if (!roomId || !stroke) return;
    socket.to(roomId).emit("skribbl:stroke_received", { stroke, drawerClerkId: socket.data.userId });
  });

  // ── skribbl:chat_message ─────────────────────────────────────────────────
  // Allows any player (typically the drawer during PICKING_WORD/ROUND_END) to send
  // a freeform chat message to the room. Broadcast as skribbl:chat_received.
  socket.on("skribbl:chat_message", async ({ roomId, message }: { roomId: string; message: string }) => {
    try {
      if (!roomId || typeof message !== "string" || message.trim() === "") return;
      const sanitized = message.trim().slice(0, 100);

      const player = await prisma.roomPlayer.findFirst({
        where: { roomId, user: { clerkId: socket.data.userId } },
        include: { user: true },
      });
      if (!player) return;

      io.to(roomId).emit("skribbl:chat_received", {
        clerkId: socket.data.userId,
        username: player.user.username,
        avatarUrl: player.user.avatarUrl,
        message: sanitized,
        sentAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[skribbl:chat_message] Error:", err);
    }
  });

  // ── skribbl:canvas_snapshot ───────────────────────────────────────────────
  // Drawer responds to skribbl:request_canvas_snapshot with the current canvas.
  // Server passes the image to the AI service and broadcasts the AI's guess.
  socket.on("skribbl:canvas_snapshot", async ({ roomId, imageBase64 }: { roomId: string; imageBase64: string }) => {
    try {
      if (!roomId || !imageBase64 || typeof imageBase64 !== "string") return;

      // Validate: must be the current drawer in DRAWING phase
      const game = await skribblService.fetchActiveGameForRoom(roomId);
      if (!game || game.phaseId !== "DRAWING") return;

      const drawerClerkId = game.playerOrder[game.currentDrawerIndex];
      if (socket.data.userId !== drawerClerkId) return;

      // Rate limit: max 3 AI calls per round
      if (!aiService.canCall(roomId, game.currentRound)) return;
      aiService.recordCall(roomId, game.currentRound);

      const currentRound = game.rounds[0];
      const hint = currentRound?.hint ?? undefined;
      const guessText = await aiService.guessDrawing(imageBase64, hint);
      if (!guessText.trim()) return;

      await skribblService.submitAiGuess(roomId, guessText, io);
    } catch (err) {
      console.error("[skribbl:canvas_snapshot] Error:", err);
    }
  });

}
