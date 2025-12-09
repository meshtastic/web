import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@components/ui/tooltip";
import type { Device } from "@core/stores/deviceStore";
import type { MessageStore } from "@core/stores/messageStore";
import { MessageState, MessageType } from "@core/stores/messageStore";
import type { Types } from "@meshtastic/core";
import type { Contact } from "@pages/Messages";
import { Label } from "@radix-ui/react-label";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

const MAX_MESSAGE_BYTES = 200;

export interface MessageInputProps {
  selectedContact: Contact;
  device: Device;
  messages: MessageStore;
}

export const MessageInput = ({
  selectedContact,
  device,
  messages,
}: MessageInputProps) => {
  const [messageDrafts, setMessageDrafts] = useState<Record<number, string>>(
    {},
  );
  const [messageBytes, setMessageBytes] = useState<Record<number, number>>({});

  const calculateBytes = (text: string) => new Blob([text]).size;

  const handleMessageChange = (contactId: number, text: string) => {
    const byteLength = calculateBytes(text);
    if (byteLength <= MAX_MESSAGE_BYTES) {
      setMessageDrafts((prev) => ({ ...prev, [contactId]: text }));
      setMessageBytes((prev) => ({ ...prev, [contactId]: byteLength }));
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !device.connection) {
      console.log("[sendMessage] Missing selectedContact or device.connection");
      return;
    }

    const draft = messageDrafts[selectedContact.id] || "";
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
      ? undefined
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

    setMessageDrafts((prev) => ({ ...prev, [selectedContact.id]: "" }));
    setMessageBytes((prev) => ({ ...prev, [selectedContact.id]: 0 }));

    try {
      // Process message through pipeline before sending
      await messages.processOutgoingMessage({
        text: trimmedMessage,
        to: toValue,
        channelId: channelValue,
        wantAck: true,
      });

      const messageId = await device.connection.sendText(
        trimmedMessage,
        toValue,
        true,
        channelValue,
      );

      console.log("[sendMessage] Message sent, ID:", messageId);

      if (messageId !== undefined) {
        if (isBroadcast) {
          messages.setMessageState({
            type: MessageType.Broadcast,
            channelId: channelValue as Types.ChannelNumber,
            messageId,
            newState: MessageState.Ack,
          });
        } else {
          messages.setMessageState({
            type: MessageType.Direct,
            nodeA: device.myNodeNum as number,
            nodeB: selectedContact.nodeNum as number,
            messageId,
            newState: MessageState.Ack,
          });
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // TODO: Handle failed message state
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
            value={messageDrafts[selectedContact.id] || ""}
            onChange={(e) =>
              handleMessageChange(selectedContact.id, e.target.value)
            }
            className="flex-1"
          />
          <span className="flex items-center text-sm text-muted-foreground min-w-[60px] justify-end">
            {messageBytes[selectedContact.id] || 0}/{MAX_MESSAGE_BYTES}
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
