import { useEffect, useRef } from "react";

// 纯 canvas 自投影 3D 粒子球体：旋转 + 连线 + 辉光，无第三方库。
export function Globe({ size = 320 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // Fibonacci 球面取点
    const N = 150;
    const R = size * 0.36;
    const pts: { x: number; y: number; z: number }[] = [];
    const gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = gold * i;
      pts.push({ x: Math.cos(t) * r * R, y: y * R, z: Math.sin(t) * r * R });
    }

    let ay = 0;
    let ax = 0.35;
    let raf = 0;
    let mouseX = 0;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
    };
    window.addEventListener("mousemove", onMove);

    function frame() {
      ay += 0.0032 + mouseX * 0.004;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const cosX = Math.cos(ax), sinX = Math.sin(ax);

      const proj = pts.map((p) => {
        let x = p.x * cosY - p.z * sinY;
        let z = p.x * sinY + p.z * cosY;
        let y = p.y * cosX - z * sinX;
        z = p.y * sinX + z * cosX;
        const persp = 420 / (420 + z);
        return { sx: cx + x * persp, sy: cy + y * persp, z, persp };
      });

      // 连线（近邻）
      for (let i = 0; i < proj.length; i++) {
        for (let j = i + 1; j < proj.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (d < R * 0.62) {
            const pa = proj[i], pb = proj[j];
            const alpha = (0.16 * (1 - d / (R * 0.62))) * ((pa.persp + pb.persp) / 2);
            ctx.strokeStyle = `rgba(90,170,255,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(pa.sx, pa.sy);
            ctx.lineTo(pb.sx, pb.sy);
            ctx.stroke();
          }
        }
      }
      // 节点
      const order = proj.map((p, i) => ({ p, i })).sort((a, b) => a.p.z - b.p.z);
      for (const { p } of order) {
        const r = 1.4 * p.persp + 0.6;
        const bright = 0.5 + 0.5 * p.persp;
        ctx.beginPath();
        ctx.fillStyle = `rgba(120,200,255,${bright})`;
        ctx.shadowColor = "rgba(80,170,255,0.9)";
        ctx.shadowBlur = 8 * p.persp;
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(frame);
    }
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, [size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className="globe-canvas" />;
}
