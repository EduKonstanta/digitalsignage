"use client";

import { useState, useCallback, MouseEvent } from "react";

interface Use3DTiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
  speed?: number;
}

export function use3DTilt({
  maxTilt = 12,
  perspective = 1000,
  scale = 1.02,
  speed = 400,
}: Use3DTiltOptions = {}) {
  const [transform, setTransform] = useState({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const percentageX = mouseX / width;
      const percentageY = mouseY / height;

      // Calculate tilt angles: inverted so mouse left tilts card right
      const rotateX = ((percentageY - 0.5) * -2 * maxTilt).toFixed(2);
      const rotateY = ((percentageX - 0.5) * 2 * maxTilt).toFixed(2);

      setTransform({
        rotateX: parseFloat(rotateX),
        rotateY: parseFloat(rotateY),
        scale,
        glareX: Math.round(percentageX * 100),
        glareY: Math.round(percentageY * 100),
        glareOpacity: 0.35,
      });
    },
    [maxTilt, scale]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0,
    });
  }, []);

  const tiltStyle = {
    transform: `perspective(${perspective}px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale3d(${transform.scale}, ${transform.scale}, ${transform.scale})`,
    transition: `transform ${speed}ms cubic-bezier(0.03, 0.98, 0.52, 0.99)`,
    transformStyle: "preserve-3d" as const,
  };

  const glareStyle = {
    background: `radial-gradient(circle at ${transform.glareX}% ${transform.glareY}%, rgba(255,255,255,0.4) 0%, rgba(6,182,212,0.15) 35%, transparent 70%)`,
    opacity: transform.glareOpacity,
    transition: `opacity ${speed}ms ease-out`,
    pointerEvents: "none" as const,
  };

  return {
    tiltStyle,
    glareStyle,
    handleMouseMove,
    handleMouseLeave,
    isTilting: transform.rotateX !== 0 || transform.rotateY !== 0,
  };
}
