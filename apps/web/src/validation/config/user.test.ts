import { describe, expect, it } from "vitest";
import { LONG_NAME_MAX_BYTES, UserValidationSchema } from "./user.ts";

const parse = (longName: string) =>
  UserValidationSchema.safeParse({
    longName,
    shortName: "ABCD",
    isUnmessageable: false,
    isLicensed: false,
  });

describe("UserValidationSchema longName", () => {
  it("limits the long name to 24 bytes", () => {
    expect(LONG_NAME_MAX_BYTES).toBe(24);
  });

  it("accepts exactly 24 ASCII characters", () => {
    expect(parse("a".repeat(24)).success).toBe(true);
  });

  it("rejects 25 ASCII characters", () => {
    expect(parse("a".repeat(25)).success).toBe(false);
  });

  it("counts UTF-8 bytes, not characters", () => {
    // "é" is 2 bytes: 12 of them fit, 13 do not.
    expect(parse("é".repeat(12)).success).toBe(true);
    expect(parse("é".repeat(13)).success).toBe(false);
    // An emoji is 4 bytes: 6 fit, 7 do not, although 7 is well under 24
    // characters.
    expect(parse("📡".repeat(6)).success).toBe(true);
    expect(parse("📡".repeat(7)).success).toBe(false);
  });

  it("reports the byte counts with the error", () => {
    const result = parse("📡".repeat(7));
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === "longName");
    expect(issue?.message).toBe("formValidation.longNameTooManyBytes");
    expect(issue).toMatchObject({ params: { maximum: 24, current: 28 } });
  });

  it("still requires a long name", () => {
    expect(parse("").success).toBe(false);
  });
});
