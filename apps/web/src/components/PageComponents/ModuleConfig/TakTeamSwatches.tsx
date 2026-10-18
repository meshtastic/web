import type { TakValidation } from "@app/validation/moduleConfig/tak.ts";
import { FieldWrapper } from "@components/Form/FormWrapper.tsx";
import { cn } from "@core/utils/cn.ts";
import { Protobuf } from "@meshtastic/sdk";
import { type SubmitHandler, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

const Team = Protobuf.ATAK.Team;

/** Android's getColorFrom(Team) (core/model TAK.kt). Unspecified is cyan. */
export const TAK_TEAM_COLORS: Record<Protobuf.ATAK.Team, string> = {
  [Team.Unspecifed_Color]: "#00FFFF",
  [Team.White]: "#FFFFFF",
  [Team.Yellow]: "#FFFF00",
  [Team.Orange]: "#FFA500",
  [Team.Magenta]: "#FF00FF",
  [Team.Red]: "#FF0000",
  [Team.Maroon]: "#800000",
  [Team.Purple]: "#800080",
  [Team.Dark_Blue]: "#00008B",
  [Team.Blue]: "#0000FF",
  [Team.Cyan]: "#00FFFF",
  [Team.Teal]: "#008080",
  [Team.Green]: "#00FF00",
  [Team.Dark_Green]: "#006400",
  [Team.Brown]: "#A52A2A",
};

const SWATCH_TEAMS = (
  Object.values(Team).filter(
    (v) => typeof v === "number",
  ) as Protobuf.ATAK.Team[]
).filter((team) => team !== Team.Unspecifed_Color);

const teamName = (team: Protobuf.ATAK.Team) =>
  (Team[team] ?? "").replace(/_/g, " ");

interface TakTeamSwatchesProps {
  onSubmit: SubmitHandler<TakValidation>;
}

/**
 * Team colours as swatches, as Android colours its Team dropdown. Picking a
 * swatch sets the team.
 */
export const TakTeamSwatches = ({ onSubmit }: TakTeamSwatchesProps) => {
  const { t } = useTranslation("moduleConfig");
  const { control, setValue, handleSubmit } = useFormContext<TakValidation>();
  const team = useWatch({ control, name: "team" });

  return (
    <FieldWrapper
      label={t("tak.teamColor.label")}
      fieldName="takTeamColor"
      description={t("tak.teamColor.description")}
    >
      <div className="flex flex-wrap gap-2">
        {SWATCH_TEAMS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={team === option}
            aria-label={teamName(option)}
            title={teamName(option)}
            onClick={() => {
              setValue("team", option, { shouldDirty: true });
              // A click isn't a change event, so stage it here.
              void handleSubmit(onSubmit)();
            }}
            className={cn(
              "size-8 cursor-pointer rounded-full border border-slate-300 dark:border-slate-500",
              team === option &&
                "ring-2 ring-slate-900 ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900",
            )}
            style={{ backgroundColor: TAK_TEAM_COLORS[option] }}
          />
        ))}
      </div>
    </FieldWrapper>
  );
};
