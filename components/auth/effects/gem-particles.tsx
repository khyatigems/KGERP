"use client";

import { useEffect, useRef } from "react";

interface Gem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  hue: number;
  opacity: number;
  type: number;
  twinkleOffset: number;
}

export function GemParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;

    const GEMS = 18;
    const COLORS = [
      { h: 215, s: 85, l: 60 },
      { h: 230, s: 90, l: 65 },
      { h: 260, s: 80, l: 65 },
      { h: 195, s: 90, l: 60 },
      { h: 45, s: 80, l: 60 },
      { h: 175, s: 75, l: 55 },
    ];

    const gems: Gem[] = [];

    const init = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      gems.length = 0;
      for (let i = 0; i < GEMS; i++) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        gems.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: 6 + Math.random() * 14,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.005,
          hue: color.h,
          opacity: 0.3 + Math.random() * 0.4,
          type: Math.floor(Math.random() * 3),
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawGem = (g: Gem, t: number) => {
      const twinkle = 0.7 + 0.3 * Math.sin(t * 0.001 + g.twinkleOffset);
      const alpha = g.opacity * twinkle;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rotation);
      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size);
      gradient.addColorStop(0, `hsla(${g.hue}, 90%, 85%, 0.9)`);
      gradient.addColorStop(0.4, `hsla(${g.hue}, 85%, 65%, 0.7)`);
      gradient.addColorStop(1, `hsla(${g.hue}, 75%, 35%, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(-g.size, -g.size, g.size * 2, g.size * 2);

      if (g.type === 0) {
        ctx.beginPath();
        ctx.moveTo(0, -g.size);
        ctx.lineTo(g.size * 0.7, 0);
        ctx.lineTo(0, g.size);
        ctx.lineTo(-g.size * 0.7, 0);
        ctx.closePath();
      } else if (g.type === 1) {
        ctx.beginPath();
        ctx.moveTo(0, -g.size);
        ctx.lineTo(g.size, 0);
        ctx.lineTo(g.size * 0.4, g.size * 0.7);
        ctx.lineTo(-g.size * 0.4, g.size * 0.7);
        ctx.lineTo(-g.size, 0);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -g.size);
        ctx.lineTo(g.size, 0);
        ctx.lineTo(0, g.size);
        ctx.lineTo(-g.size, 0);
        ctx.closePath();
      }

      ctx.strokeStyle = `hsla(${g.hue}, 95%, 80%, 0.6)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = `hsla(${g.hue}, 90%, 75%, 0.15)`;
      ctx.fill();

      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.moveTo(-g.size * 0.2, -g.size * 0.3);
      ctx.lineTo(g.size * 0.2, -g.size * 0.5);
      ctx.lineTo(g.size * 0.1, -g.size * 0.2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${g.hue}, 100%, 95%, 0.8)`;
      ctx.fill();

      ctx.restore();
    };

    const animate = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      const dx = mouseRef.current.x - width / 2;
      const dy = mouseRef.current.y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const parallaxStrength = Math.max(0, 1 - dist / 400) * 0.02;

      for (const g of gems) {
        g.x += g.vx;
        g.y += g.vy;
        g.rotation += g.rotationSpeed;

        if (g.x < -g.size * 2) g.x = width + g.size * 2;
        if (g.x > width + g.size * 2) g.x = -g.size * 2;
        if (g.y < -g.size * 2) g.y = height + g.size * 2;
        if (g.y > height + g.size * 2) g.y = -g.size * 2;

        const offsetX = (mouseRef.current.x - g.x) * parallaxStrength;
        const offsetY = (mouseRef.current.y - g.y) * parallaxStrength;
        drawGem({ ...g, x: g.x + offsetX, y: g.y + offsetY }, t);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    init();
    animationRef.current = requestAnimationFrame(animate);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", init);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
