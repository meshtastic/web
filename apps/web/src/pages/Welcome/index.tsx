import { OnboardingWizard } from "@components/Onboarding/OnboardingWizard.tsx";
import { useNavigate } from "@tanstack/react-router";

/**
 * The first-run wizard at /welcome. Rendered full screen, outside the app
 * shell, and reachable any time to walk through setup again.
 */
const WelcomePage = () => {
  const navigate = useNavigate();
  return (
    <OnboardingWizard
      onFinish={() => void navigate({ to: "/messages", replace: true })}
    />
  );
};

export default WelcomePage;
