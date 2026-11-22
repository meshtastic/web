import { CommandItem, CommandShortcut } from "@components/UI/Command.tsx";
import { Kbd } from "@components/UI/Kbd.tsx";
import { NodeAvatar } from "@components/UI/NodeAvatar.tsx";
import type { Command } from "@core/commandMenu/types.ts";
import { cn } from "@core/utils/cn.ts";
import { useTranslation } from "react-i18next";
import { commandIcons } from "./commandIcons.ts";

const tile =
  "flex size-8 shrink-0 items-center justify-center rounded-lg font-bold";

const CommandTile = ({ command }: { command: Command }) => {
  switch (command.kind) {
    case "conversation":
      if (command.target.type === "broadcast") {
        return <NodeAvatar initials="#" tone={{ kind: "channel" }} size="xs" />;
      }
      return (
        <NodeAvatar
          initials={command.initials ?? ""}
          tone={{ kind: "node", nodeNum: command.target.nodeNum }}
          size="xs"
        />
      );
    case "node":
      return (
        <NodeAvatar
          initials={command.initials}
          tone={{ kind: "node", nodeNum: command.nodeNum }}
          size="xs"
        />
      );
    case "navigate":
    case "action": {
      const Icon = commandIcons[command.icon];
      const danger = command.kind === "action" && command.danger === true;
      return (
        <span
          aria-hidden="true"
          className={cn(
            tile,
            "bg-raised",
            danger ? "text-danger" : "text-secondary",
          )}
        >
          <Icon className="size-4" />
        </span>
      );
    }
  }
};

export interface CommandRowProps {
  command: Command;
  onSelect: (command: Command) => void;
}

/** "G then M": two keys pressed one after the other. */
const KeySequence = ({ keys }: { keys: readonly [string, string] }) => {
  const { t } = useTranslation("commandPalette");
  const [first, second] = keys;
  return (
    <CommandShortcut className="flex items-center gap-1 max-md:hidden">
      <span aria-hidden="true" className="flex items-center gap-1">
        <Kbd>{first}</Kbd>
        {t("keys.then")}
        <Kbd>{second}</Kbd>
      </span>
      <span className="sr-only">
        {t("primitives.shortcut", {
          ns: "ui",
          keys: t("keys.sequence", { first, second }),
        })}
      </span>
    </CommandShortcut>
  );
};

/** One result: icon tile, label, secondary text, shortcut. */
export const CommandRow = ({ command, onSelect }: CommandRowProps) => (
  <CommandItem value={command.id} onSelect={() => onSelect(command)}>
    <CommandTile command={command} />
    <span className="flex min-w-0 flex-1 items-baseline gap-2">
      <span className="truncate font-medium">{command.label}</span>
      {command.hint ? (
        <span className="min-w-0 truncate text-meta text-muted">
          {command.hint}
        </span>
      ) : null}
    </span>
    {command.kind === "navigate" && command.shortcut ? (
      <KeySequence keys={command.shortcut} />
    ) : null}
  </CommandItem>
);
