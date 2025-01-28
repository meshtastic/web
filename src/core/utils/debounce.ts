type Callback<Args extends unknown[]> = (...args: Args) => void;

export function debounce<Args extends unknown[]>(
  callback: Callback<Args>,
  wait: number,
): Callback<Args> {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), wait);
  };
}
