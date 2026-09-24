"use client";

import React, { useEffect, useRef } from "react";

interface Node3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  vz: number;
}

export function Canvas3DBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Generate 3D spatial nodes
    const nodeCount = 45;
    const nodes: Node3D[] = [];
    const colors = [
      "rgba(6, 182, 212, 0.45)",  // Cyan neon
      "rgba(99, 102, 241, 0.40)", // Indigo neon
      "rgba(212, 175, 55, 0.35)",  // Amber gold
      "rgba(168, 85, 247, 0.35)", // Purple neon
    ];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        radius: Math.random() * 2.5 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.5,
      });
    }

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - width / 2) * 0.05;
      mouseY = (e.clientY - height / 2) * 0.05;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const focalLength = 400;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep spatial ambient glow
      const grad = ctx.createRadialGradient(
        width / 2 + mouseX * 2,
        height / 2 + mouseY * 2,
        100,
        width / 2,
        height / 2,
        Math.max(width, height)
      );
      grad.addColorStop(0, "rgba(15, 23, 42, 0.95)");
      grad.addColorStop(0.5, "rgba(7, 12, 24, 0.98)");
      grad.addColorStop(1, "rgba(2, 6, 18, 1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const projectedNodes: { px: number; py: number; scale: number; node: Node3D }[] = [];

      // Update & project 3D positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        if (node.z < 100) node.z = 900;
        if (node.z > 900) node.z = 100;
        if (Math.abs(node.x) > width) node.x = -node.x;
        if (Math.abs(node.y) > height) node.y = -node.y;

        const scale = focalLength / (focalLength + node.z);
        const px = (node.x + mouseX) * scale + width / 2;
        const py = (node.y + mouseY) * scale + height / 2;

        projectedNodes.push({ px, py, scale, node });
      }

      // Draw spatial connecting lines between nearby projected nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p1 = projectedNodes[i];
          const p2 = projectedNodes[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.18 * Math.min(p1.scale, p2.scale);
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Render projected 3D nodes
      for (const p of projectedNodes) {
        const size = p.node.radius * p.scale * 2;
        ctx.beginPath();
        ctx.arc(p.px, p.py, Math.max(1, size), 0, Math.PI * 2);
        ctx.fillStyle = p.node.color;
        ctx.shadowBlur = 12 * p.scale;
        ctx.shadowColor = p.node.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-80"
    />
  );
}
