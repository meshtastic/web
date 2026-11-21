import type { IconButtonProps } from "@components/UI/IconButton.tsx";
import type { SegmentedProps } from "@components/UI/Segmented.tsx";
import type { SettingRowProps } from "@components/UI/SettingRow.tsx";
import type { TextareaProps } from "@components/UI/Textarea.tsx";
import { describe, expectTypeOf, it } from "vitest";

/**
 * Type-level checks, enforced by `pnpm typecheck`. Inference is probed
 * through identity helpers that mirror how JSX infers a generic component.
 */
const segmented = <T extends string>(props: SegmentedProps<T>) => props;
const settingRow = <T extends string>(props: SettingRowProps<T>) => props;

type Hop = "1" | "3" | "7";

describe("Segmented typing", () => {
  it("infers T from options, so the callback gets the option union", () => {
    const props = segmented({
      "aria-label": "Hop limit",
      options: [
        { value: "1", label: "1" },
        { value: "3", label: "3" },
      ],
      value: "3",
      onValueChange: () => {},
    });
    expectTypeOf(props.value).toEqualTypeOf<"1" | "3">();
    expectTypeOf(props.onValueChange).parameter(0).toEqualTypeOf<"1" | "3">();
  });

  it("does not let value widen T", () => {
    expectTypeOf<"9">().not.toExtend<SegmentedProps<Hop>["value"]>();
    expectTypeOf<string>().not.toExtend<SegmentedProps<Hop>["value"]>();
  });

  it("requires an accessible name", () => {
    type Base = Omit<SegmentedProps<Hop>, "aria-label" | "aria-labelledby">;
    expectTypeOf<Base>().not.toExtend<SegmentedProps<Hop>>();
    expectTypeOf<Base & { "aria-label": string }>().toExtend<
      SegmentedProps<Hop>
    >();
    expectTypeOf<Base & { "aria-labelledby": string }>().toExtend<
      SegmentedProps<Hop>
    >();
  });
});

describe("SettingRow typing", () => {
  it("narrows select options and callbacks", () => {
    const props = settingRow({
      kind: "select",
      label: "Region",
      value: "US",
      options: [
        { value: "US", label: "US" },
        { value: "EU_868", label: "EU 868" },
      ],
      onValueChange: () => {},
    });
    type Row = Extract<typeof props, { kind: "select" }>;
    expectTypeOf<Row["value"]>().toEqualTypeOf<"US" | "EU_868">();
    expectTypeOf<Row["onValueChange"]>()
      .parameter(0)
      .toEqualTypeOf<"US" | "EU_868">();
  });

  it("rejects a select value outside the options", () => {
    type SelectRow = Extract<SettingRowProps<Hop>, { kind: "select" }>;
    expectTypeOf<"9">().not.toExtend<SelectRow["value"]>();
    expectTypeOf<SelectRow["onValueChange"]>()
      .parameter(0)
      .toEqualTypeOf<Hop>();
  });

  it("keys props by kind", () => {
    type SwitchRow = Extract<SettingRowProps, { kind: "switch" }>;
    expectTypeOf<SwitchRow>().toHaveProperty("checked");
    expectTypeOf<{
      kind: "switch";
      label: string;
    }>().not.toExtend<SettingRowProps>();
  });
});

describe("IconButton typing", () => {
  it("requires aria-label", () => {
    expectTypeOf<IconButtonProps>()
      .toHaveProperty("aria-label")
      .toEqualTypeOf<string>();
    type Unnamed = Omit<IconButtonProps, "aria-label">;
    expectTypeOf<Unnamed>().not.toExtend<IconButtonProps>();
  });
});

describe("Textarea typing", () => {
  it("needs a value when a limit is set", () => {
    expectTypeOf<{
      limit: { max: number; mode: "bytes" };
    }>().not.toExtend<TextareaProps>();
    expectTypeOf<{
      limit: { max: number; mode: "bytes" };
      value: string;
    }>().toExtend<TextareaProps>();
  });
});
