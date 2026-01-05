import logger from "@core/services/logger";
import { useMessageDraft } from "@data/hooks";
import { messageRepo } from "@data/index";
import type { Message, NewMessage } from "@data/schema";
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
import { useMyNode } from "@shared/hooks";
import { useDeviceCommands } from "@shared/hooks/useDeviceCommands";
import type { OutgoingMessage } from "@shared/utils/messagePipelineHandlers";
import { autoFavoriteDMHandler } from "@shared/utils/messagePipelineHandlers";
import { ArrowUp, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Contact } from "../pages/MessagesPage.tsx";

const MAX_MESSAGE_BYTES = 200;

export interface MessageInputProps {
  selectedContact: Contact;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export const MessageInput = ({
  selectedContact,
  replyingTo,
  onCancelReply,
}: MessageInputProps) => {
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
      logger.warn(
        `[MessageInput] Cannot send: selectedContact=${!!selectedContact}, isConnected=${commands.isConnected()}, myNodeNum=${myNodeNum}`,
      );
      return;
    }

    const trimmedMessage = draft.trim();

    if (!trimmedMessage) {
      return;
    }

    const isDirect = selectedContact.type === "direct";
    const destinationNodeNum = selectedContact.nodeNum ?? selectedContact.id;
    const toValue: number | "broadcast" = isDirect
      ? destinationNodeNum
      : "broadcast";

    const channelValue = isDirect
      ? 0
      : (selectedContact.id as Types.ChannelNumber);

    await clearDraft();
    const tempMessageId = Math.floor(Date.now() / 1000); //
    logger.info(
      `[MessageInput] Saving message with ownerNodeNum=${myNodeNum}, channelId=${channelValue}, type=${isDirect ? "direct" : "channel"}`,
    );

    // For direct messages, use the destination node; for channels, use broadcast address
    const toNodeValue = isDirect ? destinationNodeNum : 0xffffffff;

    const newMessage: NewMessage = {
      ownerNodeNum: myNodeNum,
      messageId: tempMessageId,
      type: isDirect ? "direct" : "channel",
      channelId: channelValue,
      fromNode: myNodeNum,
      toNode: toNodeValue,
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
      replyId: replyingTo?.messageId ?? null,
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

      const replyMessageId = replyingTo?.messageId;

      // Clear reply state after sending
      onCancelReply?.();

      commands
        .sendText(
          trimmedMessage,
          toValue,
          true,
          isDirect ? undefined : channelValue,
          replyMessageId,
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
    <div className="border-t shrink-0">
      {replyingTo ? (
        <div className="px-4 pt-3 pb-1 flex items-center gap-2 bg-muted/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("input.replyingTo", "Replying to")}
            </p>
            <p className="text-sm truncate">{replyingTo.message}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">
              {t("input.cancelReply", "Cancel reply")}
            </span>
          </Button>
        </div>
      ) : null}

      <form
        className="flex items-center gap-2 p-4"
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
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-2 py-1 rounded text-xs"></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Label htmlFor="send-message" className="sr-only">
          {t("input.tooltip", "Send Message")}
        </Label>
      </form>
    </div>
  );
};
