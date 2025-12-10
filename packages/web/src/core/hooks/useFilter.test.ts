import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useFilter } from "./useFilter";

describe("useFilter", () => {
  const options = [
    { id: "opt1", label: "Option 1" },
    { id: "opt2", label: "Option 2" },
  ];

  it("should initialize with default filter", () => {
    const { result } = renderHook(() =>
      useFilter({ options, defaultFilter: "opt1" })
    );
    expect(result.current.activeFilter).toBe("opt1");
  });

  it("should change filter in radio mode", () => {
    const { result } = renderHook(() =>
      useFilter({ options, defaultFilter: "opt1", variant: "radio" })
    );

    act(() => {
      result.current.setActiveFilter("opt2");
    });

    expect(result.current.activeFilter).toBe("opt2");
  });

  it("should toggle filter in multiselect mode (single toggle)", () => {
    const { result } = renderHook(() =>
      useFilter({ options, defaultFilter: "opt1", variant: "multiselect" })
    );

    // Toggle off
    act(() => {
      result.current.setActiveFilter("opt1");
    });
    expect(result.current.activeFilter).toBeUndefined();

    // Toggle on another
    act(() => {
      result.current.setActiveFilter("opt2");
    });
    expect(result.current.activeFilter).toBe("opt2");
  });
  
  it("should return the selected option in filteredData", () => {
    const { result } = renderHook(() =>
        useFilter({ options, defaultFilter: "opt1" })
      );
      
      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].id).toBe("opt1");
  });

  it("should return all options in filteredData if no filter active", () => {
    const { result } = renderHook(() =>
        useFilter({ options, defaultFilter: undefined })
      );
      
      expect(result.current.filteredData).toHaveLength(2);
  });
});
