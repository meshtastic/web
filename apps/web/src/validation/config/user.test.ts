import { describe, expect, it } from "vitest";
import {
  LONG_NAME_MAX_BYTES,
  NODE_STATUS_MAX_BYTES,
  UserValidationSchema,
} from "./user.ts";

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

describe("UserValidationSchema nodeStatus", () => {
  const parseStatus = (nodeStatus?: string) =>
    UserValidationSchema.safeParse({
      longName: "Node",
      shortName: "ABCD",
      isUnmessageable: false,
      isLicensed: false,
      nodeStatus,
    });

  it("limits the status message to 80 bytes", () => {
    expect(NODE_STATUS_MAX_BYTES).toBe(80);
    expect(parseStatus("a".repeat(80)).success).toBe(true);
    expect(parseStatus("a".repeat(81)).success).toBe(false);
    // 21 emoji are 84 bytes.
    const result = parseStatus("📡".repeat(21));
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) => i.path[0] === "nodeStatus");
    expect(issue?.message).toBe("formValidation.tooBig.bytes");
  });

  it("defaults to an empty status when the radio has none", () => {
    const result = parseStatus(undefined);
    expect(result.success).toBe(true);
    expect(result.data?.nodeStatus).toBe("");
  });
});
