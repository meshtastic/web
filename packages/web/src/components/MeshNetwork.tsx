import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  pulsePhase: number;
}

export function MeshNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let animationId: number;
    let nodes: Node[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const initNodes = () => {
      const nodeCount = Math.min(
        25,
        Math.floor((canvas.width * canvas.height) / 40000),
      );
      nodes = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          connections: [],
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }

      // Create connections
      nodes.forEach((node, i) => {
        const distances: { index: number; dist: number }[] = [];
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dist = Math.hypot(node.x - other.x, node.y - other.y);
            distances.push({ index: j, dist });
          }
        });
        distances.sort((a, b) => a.dist - b.dist);
        node.connections = distances.slice(0, 3).map((d) => d.index);
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const time = Date.now() * 0.001;

      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));
      });

      // Draw connections
      ctx.strokeStyle = "rgba(45, 212, 191, 0.15)";
      ctx.lineWidth = 1;

      nodes.forEach((node) => {
        node.connections.forEach((j) => {
          const other = nodes[j];
          const dist = Math.hypot(node.x - other.x, node.y - other.y);
          const maxDist = 300;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.2;
            ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();

            // Animated pulse along connection
            const pulsePos = (Math.sin(time * 2 + node.pulsePhase) + 1) / 2;
            const pulseX = node.x + (other.x - node.x) * pulsePos;
            const pulseY = node.y + (other.y - node.y) * pulsePos;

            ctx.fillStyle = `rgba(45, 212, 191, ${alpha * 2})`;
            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });

      // Draw nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(time * 2 + node.pulsePhase) * 0.3 + 0.7;
        const size = 4 * pulse;

        // Glow
        ctx.fillStyle = "rgba(45, 212, 191, 0.1)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(45, 212, 191, ${0.4 + pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
