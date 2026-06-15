import { useCallback, useState } from "react";

interface UsePasswordVisibilityToggleProps {
  initialVisible?: boolean;
}
/**
 * Manages the state for toggling password visibility.
 *
 * @param {boolean} [options.initialVisible=false]
 * @returns {{isVisible: boolean, toggleVisibility: () => void}}
 */
export function usePasswordVisibilityToggle({
  initialVisible = false,
}: UsePasswordVisibilityToggleProps = {}) {
  const [isVisible, setIsVisible] = useState<boolean>(initialVisible);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return { isVisible, toggleVisibility };
}
