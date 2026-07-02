"use client";

import React from "react";

type FabricCanvasProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  readOnly?: boolean;
  className?: string;
};

export const FabricCanvas = ({ canvasRef, readOnly = false, className = "w-full" }: FabricCanvasProps) => {
  return (
    <div className={`relative aspect-[4/3] rounded-xl overflow-hidden border border-[#211c38] bg-white ${className}`}>
      <canvas 
        ref={canvasRef} 
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} 
      />
      {readOnly && (
        <div className="absolute inset-0 cursor-not-allowed z-10" aria-hidden="true" />
      )}
    </div>
  );
};