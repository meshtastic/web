import { Button } from "@shared/components/ui/button";
import { useEffect, useState } from "react";
import { MeshNetwork } from "./MeshNetwork.tsx";

interface WelcomeSplashProps {
  onComplete: () => void;
}

export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing...");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stages = [
      { progress: 20, text: "Starting up..." },
      { progress: 45, text: "Creating database..." },
      { progress: 70, text: "Syncing configuration..." },
      { progress: 90, text: "Almost ready..." },
      { progress: 100, text: "Ready!" },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        const stage = stages[currentStage];
        if (stage) {
          setProgress(stage.progress);
          setStatusText(stage.text);
        }
        currentStage++;
      } else {
        clearInterval(interval);
        setIsReady(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#1a1a1a] text-white">
      <div className="absolute inset-0 opacity-80">
        <MeshNetwork />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        <img src="/logo.svg" alt="App Logo" className="h-24 w-24 z-10" />

        <div className="space-y-2">
          <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl text-balance">
            Meshtastic Web Client
          </h1>
          <p className="text-md md:text-xl text-gray-300">
            Off-grid mesh communication
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          {!isReady ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-sm md:text-md font-medium text-gray-300">
                {statusText}
              </p>
            </>
          ) : (
            <Button
              onClick={onComplete}
              className="w-full bg-[#4eb66a] hover:bg-[#3e8e52] text-gray-900 text-md font-medium"
              variant={"default"}
            >
              Get Started
            </Button>
          )}
        </div>

        <p className="mt-4 max-w-md text-md text-gray-400">
          {isReady
            ? "Your app is ready. Connect to your first device to start communicating off-grid."
            : "Setting up your secure mesh connection. You'll be communicating off-grid in just a moment."}
        </p>
      </div>
      <div className="absolute bottom-8 text-md text-white/50">
        Powered by Meshtastic
      </div>
    </div>
  );
}
