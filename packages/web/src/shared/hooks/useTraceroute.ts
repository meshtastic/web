import { tracerouteRepo } from "@data/index";
import type { Protobuf, Types } from "@meshtastic/core";
import { useDevice, useDeviceContext } from "@state/index.ts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import logger from "../../core/services/logger.ts";

const TRACEROUTE_TIMEOUT_MS = 30000; // 30 seconds max

interface UseTracerouteOptions {
  nodeNum: number;
}

interface UseTracerouteReturn {
  isRunning: boolean;
  progress: number;
  result: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined;
  startTraceroute: () => void;
  reset: () => void;
}

export function useTraceroute({
  nodeNum,
}: UseTracerouteOptions): UseTracerouteReturn {
  useDeviceContext(); // Ensure we're in a device context
  const { connection, traceroutes, hardware } = useDevice();
  const navigate = useNavigate();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery> | undefined
  >(undefined);

  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const tracerouteCountAtStartRef = useRef<number>(0);

  // Get current traceroute count for this node
  const currentTraceroutes = traceroutes.get(nodeNum) ?? [];

  // Watch for new traceroute responses
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    // Check if we have a new traceroute response
    if (currentTraceroutes.length > tracerouteCountAtStartRef.current) {
      // Got a response - complete the progress
      const latestTraceroute =
        currentTraceroutes[currentTraceroutes.length - 1];
      setResult(latestTraceroute);
      setProgress(100);
      setIsRunning(false);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Log and save to database
      if (latestTraceroute) {
        logger.debug("Traceroute completed:", {
          targetNodeNum: nodeNum,
          route: latestTraceroute.data.route,
          routeBack: latestTraceroute.data.routeBack,
          snrTowards: latestTraceroute.data.snrTowards,
          snrBack: latestTraceroute.data.snrBack,
        });

        tracerouteRepo
          .logTraceroute({
            ownerNodeNum: hardware.myNodeNum,
            targetNodeNum: nodeNum,
            route: latestTraceroute.data.route,
            routeBack: latestTraceroute.data.routeBack,
            snrTowards: latestTraceroute.data.snrTowards,
            snrBack: latestTraceroute.data.snrBack,
          })
          .then(() => {
            // Navigate with traceroute param to show dialog
            const currentSearch = new URLSearchParams(window.location.search);
            currentSearch.set("traceroute", String(nodeNum));
            navigate({
              to: ".",
              search: Object.fromEntries(currentSearch),
            });
          })
          .catch((error: unknown) => {
            logger.error("Failed to save traceroute to database:", error);
          });
      }
    }
  }, [currentTraceroutes, isRunning, hardware.myNodeNum, nodeNum, navigate]);

  // Progress animation
  useEffect(() => {
    if (!isRunning || startTimeRef.current === null) {
      return;
    }

    const animate = () => {
      if (startTimeRef.current === null) {
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(
        (elapsed / TRACEROUTE_TIMEOUT_MS) * 100,
        100,
      );

      setProgress(newProgress);

      if (newProgress >= 100) {
        // Timeout reached without response
        setIsRunning(false);
        animationRef.current = null;
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  const startTraceroute = useCallback(() => {
    // Don't restart if already running
    if (isRunning) {
      return;
    }

    // Don't start if no connection
    if (!connection) {
      logger.error("No connection available for traceroute");
      return;
    }

    // Reset state
    setResult(undefined);
    setProgress(0);
    setIsRunning(true);
    startTimeRef.current = Date.now();
    tracerouteCountAtStartRef.current = currentTraceroutes.length;

    // Send traceroute request
    connection.traceRoute(nodeNum).catch((error) => {
      logger.error("Failed to send traceroute:", error);
      setIsRunning(false);
      setProgress(0);
    });
  }, [isRunning, connection, nodeNum, currentTraceroutes.length]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setProgress(0);
    setResult(undefined);
    startTimeRef.current = null;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Reset when nodeNum changes
  useEffect(() => {
    reset();
  }, [reset]);

  return {
    isRunning,
    progress,
    result,
    startTraceroute,
    reset,
  };
}
