import { useEffect, useRef } from "react";

interface Node {
  id: number;
  x: number;
  y: number;
  label: string;
  radioRange: number; // LoRa radio range as percentage of canvas
}

interface RadioWave {
  originNodeId: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  generation: number; // TTL tracking - fades with each hop
  floodId: string;
}

type NodeState = "idle" | "receiving" | "transmitting" | "seen";

interface NodeStatus {
  state: NodeState;
  intensity: number;
  lastFloodId: string | null;
}

const PRIMARY_COLOR = { r: 98, g: 235, b: 140 };

const nodes: Node[] = [
  // North America
  { id: 0, x: 18, y: 28, label: "Seattle", radioRange: 18 },
  { id: 1, x: 22, y: 35, label: "Denver", radioRange: 16 },
  { id: 2, x: 28, y: 32, label: "Chicago", radioRange: 17 },
  { id: 3, x: 32, y: 38, label: "Atlanta", radioRange: 15 },
  { id: 4, x: 15, y: 42, label: "LA", radioRange: 16 },
  { id: 5, x: 35, y: 30, label: "NYC", radioRange: 14 },
  // South America
  { id: 6, x: 32, y: 62, label: "São Paulo", radioRange: 18 },
  { id: 7, x: 28, y: 72, label: "Buenos Aires", radioRange: 16 },
  // Europe
  { id: 8, x: 48, y: 28, label: "London", radioRange: 14 },
  { id: 9, x: 52, y: 32, label: "Paris", radioRange: 13 },
  { id: 10, x: 55, y: 28, label: "Berlin", radioRange: 14 },
  { id: 11, x: 50, y: 38, label: "Madrid", radioRange: 15 },
  { id: 12, x: 58, y: 36, label: "Rome", radioRange: 14 },
  // Africa
  { id: 13, x: 52, y: 52, label: "Lagos", radioRange: 16 },
  { id: 14, x: 58, y: 58, label: "Nairobi", radioRange: 15 },
  { id: 15, x: 55, y: 68, label: "Cape Town", radioRange: 17 },
  // Asia
  { id: 16, x: 68, y: 25, label: "Moscow", radioRange: 18 },
  { id: 17, x: 78, y: 38, label: "Delhi", radioRange: 16 },
  { id: 18, x: 85, y: 35, label: "Beijing", radioRange: 15 },
  { id: 19, x: 88, y: 42, label: "Shanghai", radioRange: 14 },
  { id: 20, x: 92, y: 35, label: "Tokyo", radioRange: 15 },
  { id: 21, x: 80, y: 50, label: "Singapore", radioRange: 16 },
  // Australia
  { id: 22, x: 88, y: 68, label: "Sydney", radioRange: 17 },
  { id: 23, x: 82, y: 72, label: "Perth", radioRange: 18 },
];

export function MeshNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesRef = useRef<RadioWave[]>([]);
  const nodeStatusRef = useRef<Map<number, NodeStatus>>(new Map());
  const animationRef = useRef<number>(0);
  const lastFloodTimeRef = useRef<number>(0);
  const floodSeenNodesRef = useRef<Map<string, Set<number>>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Initialize all nodes as idle
    nodes.forEach((node) => {
      nodeStatusRef.current.set(node.id, {
        state: "idle",
        intensity: 0,
        lastFloodId: null,
      });
    });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const getNodePosition = (node: Node) => ({
      x: (node.x / 100) * canvas.width,
      y: (node.y / 100) * canvas.height,
    });

    const getRadioRangePixels = (node: Node) => {
      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
      return (node.radioRange / 100) * diagonal;
    };

    const drawMap = () => {
      ctx.strokeStyle = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.1)`;
      ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.03)`;

      // North America
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.08, canvas.height * 0.2);
      ctx.lineTo(canvas.width * 0.35, canvas.height * 0.15);
      ctx.lineTo(canvas.width * 0.38, canvas.height * 0.35);
      ctx.lineTo(canvas.width * 0.25, canvas.height * 0.5);
      ctx.lineTo(canvas.width * 0.08, canvas.height * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // South America
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.25, canvas.height * 0.52);
      ctx.lineTo(canvas.width * 0.35, canvas.height * 0.55);
      ctx.lineTo(canvas.width * 0.32, canvas.height * 0.85);
      ctx.lineTo(canvas.width * 0.22, canvas.height * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Europe
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.42, canvas.height * 0.18);
      ctx.lineTo(canvas.width * 0.65, canvas.height * 0.15);
      ctx.lineTo(canvas.width * 0.6, canvas.height * 0.4);
      ctx.lineTo(canvas.width * 0.42, canvas.height * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Africa
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.45, canvas.height * 0.42);
      ctx.lineTo(canvas.width * 0.62, canvas.height * 0.45);
      ctx.lineTo(canvas.width * 0.58, canvas.height * 0.78);
      ctx.lineTo(canvas.width * 0.48, canvas.height * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Asia
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.62, canvas.height * 0.12);
      ctx.lineTo(canvas.width * 0.95, canvas.height * 0.18);
      ctx.lineTo(canvas.width * 0.92, canvas.height * 0.55);
      ctx.lineTo(canvas.width * 0.65, canvas.height * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Australia
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.78, canvas.height * 0.62);
      ctx.lineTo(canvas.width * 0.95, canvas.height * 0.65);
      ctx.lineTo(canvas.width * 0.92, canvas.height * 0.82);
      ctx.lineTo(canvas.width * 0.8, canvas.height * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const drawRangeIndicators = () => {
      nodes.forEach((node) => {
        const pos = getNodePosition(node);
        const range = getRadioRangePixels(node);

        // Very subtle range indicator
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, range, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.05)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    };

    const drawRadioWaves = () => {
      wavesRef.current = wavesRef.current.filter((wave) => {
        // Calculate alpha based on expansion and generation (TTL decay)
        const expansionRatio = wave.radius / wave.maxRadius;
        const generationFade = Math.max(0.2, 1 - wave.generation * 0.15);
        wave.alpha = (1 - expansionRatio) * 0.6 * generationFade;

        if (wave.alpha <= 0.02) {
          return false;
        }

        // Draw the expanding radio wave
        const gradient = ctx.createRadialGradient(
          wave.x,
          wave.y,
          wave.radius * 0.8,
          wave.x,
          wave.y,
          wave.radius,
        );
        gradient.addColorStop(
          0,
          `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0)`,
        );
        gradient.addColorStop(
          0.5,
          `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, ${wave.alpha})`,
        );
        gradient.addColorStop(
          1,
          `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0)`,
        );

        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Check which nodes this wave reaches
        const seenNodes = floodSeenNodesRef.current.get(wave.floodId);
        if (seenNodes && wave.generation < 6) {
          // Max 6 hops (TTL)
          nodes.forEach((node) => {
            if (node.id === wave.originNodeId) {
              return;
            }
            if (seenNodes.has(node.id)) {
              return;
            }

            const nodePos = getNodePosition(node);
            const distance = Math.sqrt(
              (nodePos.x - wave.x) ** 2 + (nodePos.y - wave.y) ** 2,
            );

            // Node receives when wave passes through it
            if (
              distance <= wave.radius &&
              distance >= wave.radius - wave.speed * 2
            ) {
              seenNodes.add(node.id);

              // Update node state to receiving
              const status = nodeStatusRef.current.get(node.id);
              if (status) {
                status.state = "receiving";
                status.intensity = 1;
                status.lastFloodId = wave.floodId;
              }

              // After a short delay, node rebroadcasts (simulating processing time)
              setTimeout(
                () => {
                  const currentStatus = nodeStatusRef.current.get(node.id);
                  if (currentStatus) {
                    currentStatus.state = "transmitting";
                    currentStatus.intensity = 1;
                  }

                  // Emit new radio wave from this node
                  const pos = getNodePosition(node);
                  wavesRef.current.push({
                    originNodeId: node.id,
                    x: pos.x,
                    y: pos.y,
                    radius: 0,
                    maxRadius: getRadioRangePixels(node),
                    speed: 1.5 + Math.random() * 0.5,
                    alpha: 1,
                    generation: wave.generation + 1,
                    floodId: wave.floodId,
                  });
                },
                150 + Math.random() * 100,
              );
            }
          });
        }

        // Expand the wave
        wave.radius += wave.speed;

        return wave.radius < wave.maxRadius;
      });
    };

    const drawNodes = () => {
      nodes.forEach((node) => {
        const pos = getNodePosition(node);
        const status = nodeStatusRef.current.get(node.id);
        const state = status?.state || "idle";
        const intensity = status?.intensity || 0;

        // Decay intensity over time
        if (status && status.intensity > 0) {
          status.intensity = Math.max(0, status.intensity - 0.005);
          if (status.intensity <= 0) {
            status.state = status.lastFloodId ? "seen" : "idle";
          }
        }

        // Different glow based on state
        let glowColor: string;
        let glowRadius: number;
        let nodeColor: string;

        switch (state) {
          case "transmitting":
            glowColor = `rgba(255, 255, 255, ${0.4 + intensity * 0.6})`;
            glowRadius = 20 + intensity * 15;
            nodeColor = "#ffffff";
            break;
          case "receiving":
            glowColor = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, ${0.5 + intensity * 0.5})`;
            glowRadius = 15 + intensity * 10;
            nodeColor = `rgb(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b})`;
            break;
          case "seen":
            glowColor = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.3)`;
            glowRadius = 12;
            nodeColor = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.7)`;
            break;
          default: // idle
            glowColor = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.2)`;
            glowRadius = 10;
            nodeColor = `rgba(${PRIMARY_COLOR.r}, ${PRIMARY_COLOR.g}, ${PRIMARY_COLOR.b}, 0.5)`;
        }

        // Outer glow
        const gradient = ctx.createRadialGradient(
          pos.x,
          pos.y,
          0,
          pos.x,
          pos.y,
          glowRadius,
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node center
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // White center for active nodes
        if (state === "transmitting" || state === "receiving") {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
      });
    };

    const triggerFlood = (timestamp: number) => {
      const interval = 3000 + Math.random() * 2000;
      if (timestamp - lastFloodTimeRef.current > interval) {
        const randomNodeIndex = Math.floor(Math.random() * nodes.length);
        const originNode = nodes[randomNodeIndex];
        const floodId = `flood-${originNode.id}-${timestamp}`;

        // Track seen nodes for this flood
        floodSeenNodesRef.current.set(floodId, new Set([originNode.id]));

        // Update origin node state
        const status = nodeStatusRef.current.get(originNode.id);
        if (status) {
          status.state = "transmitting";
          status.intensity = 1;
          status.lastFloodId = floodId;
        }

        // Emit initial radio wave
        const pos = getNodePosition(originNode);
        wavesRef.current.push({
          originNodeId: originNode.id,
          x: pos.x,
          y: pos.y,
          radius: 0,
          maxRadius: getRadioRangePixels(originNode),
          speed: 1.5,
          alpha: 1,
          generation: 0,
          floodId: floodId,
        });

        lastFloodTimeRef.current = timestamp;

        // Clean up old flood tracking after some time
        setTimeout(() => {
          floodSeenNodesRef.current.delete(floodId);
          // Reset nodes that were part of this flood
          nodes.forEach((node) => {
            const nodeStatus = nodeStatusRef.current.get(node.id);
            if (nodeStatus && nodeStatus.lastFloodId === floodId) {
              nodeStatus.state = "idle";
              nodeStatus.lastFloodId = null;
            }
          });
        }, 8000);
      }
    };

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark background
      const bgGradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7,
      );
      bgGradient.addColorStop(0, "#111827");
      bgGradient.addColorStop(1, "#030712");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawMap();
      drawRangeIndicators();
      drawRadioWaves();
      drawNodes();

      triggerFlood(timestamp);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" />;
}
