import { describe, expect, it } from "vitest";
import {
  createInitialDialogState,
  dialogReducer,
} from "./AddConnectionDialog.tsx";

const testing = createInitialDialogState({
  protocol: "https",
  url: "192.168.1.10",
  testStatus: "testing",
});

describe("dialogReducer test results", () => {
  it("applies a result for the protocol and URL that were tested", () => {
    const next = dialogReducer(testing, {
      type: "TEST_RESULT",
      payload: {
        protocol: "https",
        url: "192.168.1.10",
        status: "success",
        slowLocalName: false,
      },
    });
    expect(next.testStatus).toBe("success");
  });

  it("ignores a result after the protocol changed", () => {
    const switched = dialogReducer(testing, {
      type: "SET_PROTOCOL_DEFAULT",
      payload: "http",
    });
    expect(switched.testStatus).toBe("idle");
    const next = dialogReducer(switched, {
      type: "TEST_RESULT",
      payload: {
        protocol: "https",
        url: "192.168.1.10",
        status: "success",
        slowLocalName: false,
      },
    });
    expect(next.testStatus).toBe("idle");
  });

  it("ignores a result after the URL changed", () => {
    const edited = dialogReducer(testing, {
      type: "SET_URL_AND_RESET_TEST",
      payload: "192.168.1.11",
    });
    const next = dialogReducer(edited, {
      type: "TEST_RESULT",
      payload: {
        protocol: "https",
        url: "192.168.1.10",
        status: "success",
        slowLocalName: false,
      },
    });
    expect(next.testStatus).toBe("idle");
  });

  it("resets the test when the protocol is forced", () => {
    const succeeded = {
      ...testing,
      protocol: "http" as const,
      testStatus: "success" as const,
    };
    const next = dialogReducer(succeeded, {
      type: "FORCE_PROTOCOL",
      payload: "https",
    });
    expect(next).toMatchObject({ protocol: "https", testStatus: "idle" });
  });
});
