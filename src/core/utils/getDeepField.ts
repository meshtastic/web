export function getDeepField<O extends object = object, D = any>(
  object: O,
  path: string,
  defaultValue?: D,
): D | undefined {
  const keys = path.split(".");
  let value: any = object;

  for (const key of keys) {
    if (!Object.hasOwn(value, key)) {
      return defaultValue;
    }

    value = value[key];
  }

  return value ?? defaultValue;
}
