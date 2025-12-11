import { useEffect, useState } from "react";
import { MeshNetwork } from "./MeshNetwork.tsx";

interface WelcomeSplashProps {
  onComplete: () => void;
}

export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initializing...");

  useEffect(() => {
    const stages = [
      { progress: 20, text: "Starting up..." },
      { progress: 45, text: "Creating database..." },
      { progress: 70, text: "Syncing configuration..." },
      { progress: 90, text: "Almost ready..." },
      { progress: 100, text: "Welcome!" },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        // biome-ignore lint/style/noNonNullAssertion: Stages are guaranteed to have a value
        setProgress(stages[currentStage]!.progress);
        // biome-ignore lint/style/noNonNullAssertion: Stages are guaranteed to have a value
        setStatusText(stages[currentStage]!.text);
        currentStage++;
      } else {
        clearInterval(interval);
        onComplete();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#1a1a1a] text-white">
      {/* Animated mesh background */}
      <div className="absolute inset-0 opacity-80">
        <MeshNetwork />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
        {/* Logo/Icon */}
        <div className="relative">
          <span className="animate-pulse [animation-duration:3s] z-0">
            <img src="/logo.svg" alt="App Logo" className="h-24 w-24 z-10" />
          </span>
          {/* </div> */}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl text-balance">
            Meshtastic Web Client
          </h1>
          <p className="text-base md:text-lg text-gray-300">Off-grid mesh communication</p>
        </div>

        {/* Progress section */}
        <div className="w-full max-w-xs space-y-3">
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status text */}
          <p className="text-xs md:text-sm font-medium text-gray-300 animate-pulse">
            {statusText}
          </p>
        </div>

        {/* Reassurance message */}
        <p className="mt-4 max-w-md text-xs md:text-sm text-gray-400">
          Setting up your secure mesh connection. You&apos;ll be communicating
          off-grid in just a moment.
        </p>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-xs text-white/50">
        Powered by Meshtastic
      </div>
    </div>
  );
}
