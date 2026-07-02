import { randomUUID } from "crypto";
import type { Socket } from "socket.io";
import type { AppServer } from "../index";
import { prisma } from "../../config/prisma";
import * as garticService from "../../services/garticPhoneService";

// ── Helpers ───────────────────────────────────────────────────

async function fetchActiveGame(roomId: string) {
  return prisma.garticGame.findFirst({
    where: { roomId, phaseId: { notIn: ["FINISHED", "REWIND"] } },
    include: { chains: true },
  });
}

function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>&"']/g, "")
    .trim()
    .slice(0, 80);
}

// ── Handler registration ──────────────────────────────────────

export function registerGarticHandlers(io: AppServer, socket: Socket): void {

  // ── gartic:submit_prompt ────────────────────────────────────
  socket.on("gartic:submit_prompt", async ({ roomId, prompt }: { roomId: string; prompt: string }) => {
    try {
      const userId = socket.data.userId;
      const sanitized = sanitizeText(prompt) || "???";

      const game = await fetchActiveGame(roomId);
      if (!game) return;

      const chain = await prisma.garticChain.findFirst({
        where: { garticGameId: game.id, ownerId: userId },
      });
      if (!chain) return;

      const alreadySubmitted = await prisma.garticChainStep.findUnique({
        where: { chainId_stepIndex: { chainId: chain.id, stepIndex: game.currentStep } },
      });
      if (alreadySubmitted) return;

      await prisma.garticChainStep.create({
        data: { chainId: chain.id, authorId: userId, stepIndex: game.currentStep, typeId: "PROMPT", content: sanitized },
      });

      socket.to(roomId).emit("gartic:player_done", { playerId: userId });

      const submitted = await garticService.allPlayersSubmitted(game.id, game.currentStep, game.chains.length);
      if (submitted) await garticService.advanceToNextPhase(io, roomId, game.id);
    } catch (err) {
      console.error("[gartic:submit_prompt] Error:", err);
    }
  });

  // ── gartic:submit_drawing ───────────────────────────────────
  socket.on(
    "gartic:submit_drawing",
    async ({ roomId, imageBase64, strokeData, rating }: {
      roomId: string; imageBase64: string; strokeData?: string; rating?: string;
    }) => {
      try {
        const userId = socket.data.userId;
        if (!imageBase64 || typeof imageBase64 !== "string") return;

        const game = await fetchActiveGame(roomId);
        if (!game) return;

        const allChains = await prisma.garticChain.findMany({
          where: { garticGameId: game.id }, orderBy: { orderIndex: "asc" },
        });
        const totalPlayers = allChains.length;
        const playerIndex = allChains.findIndex((c) => c.ownerId === userId);
        if (playerIndex === -1) return;

        const targetChainIndex = (playerIndex + game.currentStep) % totalPlayers;
        const targetChain = allChains[targetChainIndex];

        const alreadySubmitted = await prisma.garticChainStep.findUnique({
          where: { chainId_stepIndex: { chainId: targetChain.id, stepIndex: game.currentStep } },
        });
        if (alreadySubmitted) return;

        await prisma.$executeRaw`
          INSERT INTO gartic_chain_steps
            (id, "chainId", "authorId", "stepIndex", "typeId", content, "strokeData", "ratingId", "submittedAt")
          VALUES
            (${randomUUID()}, ${targetChain.id}, ${userId}, ${game.currentStep}, 'DRAW',
             ${imageBase64}, ${strokeData ?? null}, ${rating ?? null}, NOW())
        `;

        socket.to(roomId).emit("gartic:player_done", { playerId: userId });

        const submitted = await garticService.allPlayersSubmitted(game.id, game.currentStep, totalPlayers);
        if (submitted) await garticService.advanceToNextPhase(io, roomId, game.id);
      } catch (err) {
        console.error("[gartic:submit_drawing] Error:", err);
      }
    }
  );

  // ── gartic:submit_description ───────────────────────────────
  socket.on(
    "gartic:submit_description",
    async ({ roomId, description, rating }: { roomId: string; description: string; rating?: string }) => {
      try {
        const userId = socket.data.userId;
        const sanitized = sanitizeText(description) || "???";

        const game = await fetchActiveGame(roomId);
        if (!game) return;

        const allChains = await prisma.garticChain.findMany({
          where: { garticGameId: game.id }, orderBy: { orderIndex: "asc" },
        });
        const totalPlayers = allChains.length;
        const playerIndex = allChains.findIndex((c) => c.ownerId === userId);
        if (playerIndex === -1) return;

        const targetChainIndex = (playerIndex + game.currentStep) % totalPlayers;
        const targetChain = allChains[targetChainIndex];

        const alreadySubmitted = await prisma.garticChainStep.findUnique({
          where: { chainId_stepIndex: { chainId: targetChain.id, stepIndex: game.currentStep } },
        });
        if (alreadySubmitted) return;

        await prisma.$executeRaw`
          INSERT INTO gartic_chain_steps
            (id, "chainId", "authorId", "stepIndex", "typeId", content, "ratingId", "submittedAt")
          VALUES
            (${randomUUID()}, ${targetChain.id}, ${userId}, ${game.currentStep}, 'DESCRIBE',
             ${sanitized}, ${rating ?? null}, NOW())
        `;

        socket.to(roomId).emit("gartic:player_done", { playerId: userId });

        const submitted = await garticService.allPlayersSubmitted(game.id, game.currentStep, totalPlayers);
        if (submitted) await garticService.advanceToNextPhase(io, roomId, game.id);
      } catch (err) {
        console.error("[gartic:submit_description] Error:", err);
      }
    }
  );

  // ── gartic:rewind_next ──────────────────────────────────────
  socket.on("gartic:rewind_next", async ({ roomId }: { roomId: string }) => {
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } });
      if (room?.hostId !== socket.data.userId) return;
      io.to(roomId).emit("gartic:rewind_next");
    } catch (err) {
      console.error("[gartic:rewind_next] Error:", err);
    }
  });

  // ── gartic:end_rewind ───────────────────────────────────────
  socket.on("gartic:end_rewind", async ({ roomId }: { roomId: string }) => {
    try {
      const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } });
      if (room?.hostId !== socket.data.userId) return;

      const game = await prisma.garticGame.findFirst({
        where: { roomId, phaseId: "REWIND" },
      });
      if (!game) return;

      await garticService.finishGame(io, roomId, game.id);
    } catch (err) {
      console.error("[gartic:end_rewind] Error:", err);
    }
  });

  // ── gartic:stroke ───────────────────────────────────────────
  socket.on("gartic:stroke", ({ roomId, strokeData }: { roomId: string; strokeData: unknown }) => {
    socket.to(roomId).emit("gartic:stroke_received", strokeData as any);
  });
}
