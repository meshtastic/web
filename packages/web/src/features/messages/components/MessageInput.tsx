import logger from "@core/services/logger";
import { useMessageDraft } from "@data/hooks";
import { useMyNode } from "@shared/hooks";
import { messageRepo } from "@data/index";
import type { NewMessage } from "@data/schema";
import type { Types } from "@meshtastic/core";
import { Label } from "@radix-ui/react-label";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { useDeviceCommands } from "@shared/hooks/useDeviceCommands";
import type { OutgoingMessage } from "@shared/utils/messagePipelineHandlers";
import { autoFavoriteDMHandler } from "@shared/utils/messagePipelineHandlers";
import { ArrowUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Contact } from "../pages/MessagesPage.tsx";

const MAX_MESSAGE_BYTES = 200;

export interface MessageInputProps {
  selectedContact: Contact;
}

export const MessageInput = ({ selectedContact }: MessageInputProps) => {
  const { t } = useTranslation("messages");
  const { myNodeNum } = useMyNode();
  const commands = useDeviceCommands();

  const { draft, setDraft, clearDraft } = useMessageDraft(
    myNodeNum,
    selectedContact.type === "direct" ? "direct" : "channel",
    selectedContact.id,
  );

  const calculateBytes = useMemo(
    () => (text: string) => new Blob([text]).size,
    [],
  );
  const messageBytes = useMemo(
    () => calculateBytes(draft),
    [draft, calculateBytes],
  );

  const handleMessageChange = (text: string) => {
    const byteLength = calculateBytes(text);
    if (byteLength <= MAX_MESSAGE_BYTES) {
      setDraft(text);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !commands.isConnected() || !myNodeNum) {
      return;
    }

    const trimmedMessage = draft.trim();

    if (!trimmedMessage) {
      return;
    }

    const isDirect = selectedContact.type === "direct";

    // Determine destination and channel based on contact type
    const toValue = isDirect
      ? (selectedContact.nodeNum as number)
      : ("broadcast" as const);

    const channelValue = isDirect
      ? 0
      : (selectedContact.id as Types.ChannelNumber);

    // Clear draft immediately
    await clearDraft();

    // Generate a temporary message ID for optimistic UI
    const tempMessageId = Math.floor(Date.now() / 1000); // Use seconds like Meshtastic does

    // Save message immediately for instant UI feedback
    logger.info(
      `[MessageInput] Saving message with ownerNodeNum=${myNodeNum}, channelId=${channelValue}, type=${isDirect ? "direct" : "channel"}`,
    );
    const newMessage: NewMessage = {
      ownerNodeNum: myNodeNum,
      messageId: tempMessageId,
      type: isDirect ? "direct" : "channel",
      channelId: channelValue,
      fromNode: myNodeNum,
      toNode: isDirect ? (selectedContact.nodeNum as number) : 0xffffffff,
      message: trimmedMessage,
      date: new Date(),
      state: "sending",
      rxSnr: 0,
      rxRssi: 0,
      viaMqtt: false,
      hops: 0,
      retryCount: 0,
      maxRetries: 3,
      receivedACK: false,
      ackError: 0,
      realACK: false,
    };

    try {
      await messageRepo.saveMessage(newMessage);
    } catch (error) {
      console.error("[sendMessage] Failed to save message:", error);
      return;
    }

    try {
      // Run pipeline handlers (auto-favorite, etc)
      const outgoingMessage: OutgoingMessage = {
        text: trimmedMessage,
        to: toValue,
        channelId: channelValue,
        wantAck: true,
      };

      await autoFavoriteDMHandler(outgoingMessage, myNodeNum);

      // Send message - don't await, handle result asynchronously
      commands
        .sendText(
          trimmedMessage,
          toValue,
          true,
          isDirect ? undefined : channelValue,
        )
        .then(async (realMessageId) => {
          if (realMessageId !== undefined) {
            // Update message state to sent
            await messageRepo.updateMessageStateByMessageId(
              tempMessageId,
              myNodeNum,
              "sent",
            );
          }
        })
        .catch(async (error) => {
          console.error("[sendMessage] Failed to send:", error);
          await messageRepo.updateMessageStateByMessageId(
            tempMessageId,
            myNodeNum,
            "failed",
          );
        });
    } catch (error) {
      console.error("[sendMessage] Failed to send message:", error);
      await messageRepo.updateMessageStateByMessageId(
        tempMessageId,
        myNodeNum,
        "failed",
      );
    }
  };

  return (
    <div className="border-t p-4 shrink-0">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <div className="flex-1 flex gap-2">
          <Input
            placeholder={`Message ${selectedContact.name}...`}
            value={draft}
            onChange={(e) => handleMessageChange(e.target.value)}
            className="flex-1"
          />
          <span className="flex items-center text-sm text-muted-foreground min-w-15 justify-end">
            {messageBytes}/{MAX_MESSAGE_BYTES}
          </span>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              {/** biome-ignore lint/correctness/useUniqueElementIds: its a single button and can have a static id*/}
              <Button
                size="icon"
                type="submit"
                className="rounded-full"
                id="send-message"
                // disabled={!isConnected}
                // variant={isConnected ? "default" : "secondary"}
              >
                {/* {isConnected ? (
                  <ArrowUp className="h-5 w-5" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )} */}
                <ArrowUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-2 py-1 rounded text-xs">
              {/* {isConnected ? t("input.toolitp") : t("input.notConnected")} */}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Label htmlFor="send-message" className="sr-only">
          {t("input.tooltip", "Send Message")}
        </Label>
      </form>
    </div>
  );
};
