import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import { messageRepo } from "@db/index";
import { dbEvents, DB_EVENTS } from "@db/events";
import type { NewMessage } from "@db/schema";
import type { Device } from "@core/stores/deviceStore";
import { autoFavoriteDMHandler } from "@core/utils/messagePipelineHandlers";
import type {
  OutgoingMessage,
  PipelineContext,
} from "@core/utils/messagePipelineHandlers";
import type { Types } from "@meshtastic/core";
import type { Contact } from "@pages/Messages";
import { useMessageDraft } from "@db/hooks";
import { Label } from "@radix-ui/react-label";
import { ArrowUp } from "lucide-react";
import { useMemo } from "react";

const MAX_MESSAGE_BYTES = 200;

export interface MessageInputProps {
  selectedContact: Contact;
  device: Device;
}

export const MessageInput = ({
  selectedContact,
  device,
}: MessageInputProps) => {
  // Use database drafts
  const { draft, setDraft, clearDraft } = useMessageDraft(
    device.id,
    selectedContact.type === "direct" ? "direct" : "broadcast",
    selectedContact.id,
  );

  const calculateBytes = (text: string) => new Blob([text]).size;
  const messageBytes = useMemo(() => calculateBytes(draft), [draft]);

  const handleMessageChange = (text: string) => {
    const byteLength = calculateBytes(text);
    if (byteLength <= MAX_MESSAGE_BYTES) {
      setDraft(text);
    }
  };

  const sendMessage = async () => {
    console.log("[sendMessage] Attempting to send:", {
      hasSelectedContact: !!selectedContact,
      hasConnection: !!device.connection,
      myNodeNum: device.myNodeNum,
      deviceId: device.id,
      draft,
    });

    if (!selectedContact || !device.connection || !device.myNodeNum) {
      console.log("[sendMessage] Missing required values:", {
        selectedContact: selectedContact ? "present" : "MISSING",
        connection: device.connection ? "present" : "MISSING",
        myNodeNum: device.myNodeNum ?? "MISSING",
      });
      return;
    }

    const trimmedMessage = draft.trim();

    if (!trimmedMessage) {
      return;
    }

    const isDirect = selectedContact.type === "direct";
    const isBroadcast = selectedContact.type === "channel";

    // Determine destination and channel based on contact type
    const toValue = isDirect
      ? (selectedContact.nodeNum as number)
      : ("broadcast" as const);

    const channelValue = isDirect
      ? 0
      : (selectedContact.id as Types.ChannelNumber);

    console.log("[sendMessage] Sending:", {
      message: trimmedMessage,
      isDirect,
      isBroadcast,
      toValue,
      channelValue,
      selectedContact: selectedContact.name,
      nodeNum: selectedContact.nodeNum,
    });

    // Clear draft immediately
    await clearDraft();

    try {
      // Run pipeline handlers (auto-favorite, etc)
      const outgoingMessage: OutgoingMessage = {
        text: trimmedMessage,
        to: toValue,
        channelId: channelValue,
        wantAck: true,
      };

      const pipelineContext: PipelineContext = {
        deviceId: device.id,
        myNodeNum: device.myNodeNum,
      };

      await autoFavoriteDMHandler(outgoingMessage, pipelineContext);

      // Send message over radio
      const messageId = await device.connection.sendText(
        trimmedMessage,
        toValue,
        true,
        isDirect ? undefined : channelValue,
      );

      console.log("[sendMessage] Message sent, ID:", messageId);

      // Save message to database
      if (messageId !== undefined) {
        const newMessage: NewMessage = {
          deviceId: device.id,
          messageId,
          type: isDirect ? "direct" : "broadcast",
          channelId: channelValue,
          fromNode: device.myNodeNum,
          toNode: isDirect ? (selectedContact.nodeNum as number) : 0xffffffff,
          message: trimmedMessage,
          date: new Date(),
          state: "sent", // Optimistically set to sent
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

        console.log("[sendMessage] Saving message to database:", newMessage);
        await messageRepo.saveMessage(newMessage);
        console.log("[sendMessage] Message saved, emitting event");

        // Emit event to trigger UI refresh
        dbEvents.emit(DB_EVENTS.MESSAGE_SAVED);
        console.log("[sendMessage] Event emitted");
      } else {
        console.log("[sendMessage] messageId was undefined, message not saved");
      }
    } catch (error) {
      console.error("[sendMessage] Failed to send message:", error);
      // TODO: Update message state to "failed" in database
    }
  };

  return (
    <div className="border-t p-4">
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
          <span className="flex items-center text-sm text-muted-foreground min-w-[60px] justify-end">
            {messageBytes}/{MAX_MESSAGE_BYTES}
          </span>
        </div>
        {/** biome-ignore lint/correctness/useUniqueElementIds: this improves the accessability of the element */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                type="submit"
                className="rounded-full"
                id="send-message"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 dark:bg-slate-600 text-white px-2 py-1 rounded text-xs">
              Send message
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Label htmlFor="send-message" className="sr-only">
          Send
        </Label>
      </form>
    </div>
  );
};
