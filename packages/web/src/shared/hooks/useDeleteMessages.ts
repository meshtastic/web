import { useMyNode } from "@shared/hooks";
import { messageRepo } from "@data/index";
import { useCallback } from "react";

/**
 * Hook to delete all messages for the current device
 */
export function useDeleteMessages() {
  const { myNodeNum } = useMyNode();

  const deleteAllMessages = useCallback(async () => {
    await messageRepo.deleteAllMessages(myNodeNum);
  }, [myNodeNum]);

  return { deleteAllMessages };
}
