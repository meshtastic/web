export const fetcher = async <JSON>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> => {
  const res = await fetch(input, init);
  return res.json() as Promise<JSON>;
};
