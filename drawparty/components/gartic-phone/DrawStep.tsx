"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FabricCanvas } from "@/components/canvas/FabricCanvas";
import { ColorPalette, BrushSlider, ActionTools } from "@/components/canvas/CanvasToolbar";
import { useFabricCanvas } from "@/hooks/useFabricCanvas";
import type { FabricStroke, RoomPlayerDTO } from "@/types/game";
import { useLanguage } from "@/context/LanguageContext";

// Exposed via ref so the play page can apply remote strokes and read canvas state on timer expiry
export type DrawStepHandle = {
  applyRemoteStroke: (stroke: FabricStroke) => void;
  getImageBase64: () => Promise<string>;
  getStrokes: () => FabricStroke[];
};

type DrawStepProps = {
  promptText: string;
  timeLeft: number;
  currentRound: number;
  totalRounds: number;
  onSubmit: (imageBase64: string, strokes: FabricStroke[]) => void;
  onUnlock: () => void;
  onStroke?: (stroke: FabricStroke) => void;
  hasSubmitted: boolean;
  donePlayers: Set<string>;
  players: RoomPlayerDTO[];
};

export const DrawStep = forwardRef<DrawStepHandle, DrawStepProps>(function DrawStep(
  { promptText, timeLeft, currentRound, totalRounds, onSubmit, onUnlock, onStroke, hasSubmitted, donePlayers, players },
  ref
) {
  const { t } = useLanguage();
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId ?? "";

  const handleStroke = (stroke: FabricStroke) => {
    onStroke?.(stroke);
  };

  const {
    canvasRef,
    color,
    setColor,
    brushSize,
    setBrushSize,
    activeTool,
    setActiveTool,
    undo,
    clearCanvas,
    getImageBase64,
    getStrokes,
    setReadOnly,
    applyRemoteStroke,
  } = useFabricCanvas(roomId, handleStroke);

  // Expose canvas methods to the parent play page via ref
  useImperativeHandle(ref, () => ({ applyRemoteStroke, getImageBase64, getStrokes }), [applyRemoteStroke, getImageBase64, getStrokes]);

  useEffect(() => {
    setReadOnly(hasSubmitted);
  }, [hasSubmitted, setReadOnly]);

  const handleSubmitClick = async () => {
    const base64 = await getImageBase64();
    const strokes = getStrokes();
    onSubmit(base64, strokes);
  };

  return (
    <div className="flex flex-col gap-2 md:gap-4 w-full max-w-[1000px] mx-auto">

      {/* --- HEADER --- */}
      <div className="flex items-center gap-4 w-full">
        {/* Pastille Round */}
        <div className="bg-white text-black font-bold py-1.5 px-4 rounded-lg text-sm">
          {currentRound}/{totalRounds}
        </div>

        {/* Barre de progression du temps */}
        <div className="flex-1 h-3 bg-[#211c38] rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 45) * 100}%` }}
          />
        </div>

      </div>

      {/* BANNIÈRE DE PROMPT */}
      <div className="p-2 md:p-3 rounded-xl bg-white text-center shadow-sm flex items-center justify-center min-h-[36px] md:min-h-[48px]">
        <h2 className="text-sm md:text-base font-bold text-[#161228] uppercase tracking-widest">
          {promptText ? promptText : t.garticPhone.waitingForPrompt}
        </h2>
      </div>

      {/* 3-COLUMN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-2 md:gap-4 w-full">

        {/* COLONNE DE GAUCHE : Palette — desktop only sidebar */}
        <div className="hidden lg:flex flex-none justify-end self-center">
          <ColorPalette color={color} activeTool={activeTool} onColorChange={setColor} onToolChange={setActiveTool} />
        </div>

        {/* COLONNE CENTRALE : Canvas + Slider */}
        <div className="flex-1 flex flex-col gap-3 relative min-w-0">
          <FabricCanvas canvasRef={canvasRef} readOnly={hasSubmitted} />
          <BrushSlider brushSize={brushSize} color={color} activeTool={activeTool} onBrushSizeChange={setBrushSize} />
        </div>

        {/* COLONNE DE DROITE : Outils — desktop only sidebar */}
        <div className="hidden lg:flex flex-none justify-start self-center">
          <ActionTools activeTool={activeTool} onToolChange={setActiveTool} onUndo={undo} onClear={clearCanvas} />
        </div>

        {/* MOBILE — palette + outils en rangée horizontale sous le canvas */}
        <div className="flex lg:hidden flex-row gap-2 justify-center w-full">
          <ColorPalette color={color} activeTool={activeTool} onColorChange={setColor} onToolChange={setActiveTool} orientation="horizontal" />
          <ActionTools activeTool={activeTool} onToolChange={setActiveTool} onUndo={undo} onClear={clearCanvas} orientation="horizontal" />
        </div>

      </div>

      {/* READY COUNT + SUBMIT / MODIFY */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
        {(donePlayers.size > 0 || hasSubmitted) && (
          <p className="text-sm text-[#7a6f99]">
            {t.garticPhone.lockedIn.replace("{n}", String(donePlayers.size + (hasSubmitted ? 1 : 0))).replace("{m}", String(players.length || 1))}
          </p>
        )}
        <div className="flex gap-3 w-full">
          {hasSubmitted ? (
            <>
              <Button
                disabled
                className="flex-1 bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] text-white font-bold py-3 md:py-6 text-lg transition-all opacity-60"
              >
                {t.garticPhone.drawingSent}
              </Button>
              <Button
                onClick={onUnlock}
                variant="outline"
                className="border-[#211c38] text-[#9B6FDF] hover:bg-[#1e1836] py-3 md:py-6 px-4 md:px-5"
              >
                {t.garticPhone.modify}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSubmitClick}
              className="flex-1 bg-gradient-to-r from-[#7B4FBF] to-[#3AAFD4] hover:opacity-90 text-white font-bold py-3 md:py-6 text-lg transition-all"
            >
              {t.garticPhone.lockInDrawing}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
});
