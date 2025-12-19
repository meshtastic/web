import { useDebounce } from "@core/hooks/useDebounce";
import { useCallback, useEffect, useState } from "react";
import { messageRepo } from "../repositories/index.ts";
import type { ConversationType } from "../types.ts";

/**
 * Hook to manage message drafts for a conversation
 */
export function useMessageDraft(
  deviceId: number,
  type: ConversationType,
  targetId: number,
) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        setLoading(true);
        const savedDraft = await messageRepo.getDraft(deviceId, type, targetId);
        if (savedDraft) {
          setDraft(savedDraft.content);
        }
      } catch (error) {
        console.error("[useMessageDraft] Error loading draft:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [deviceId, type, targetId]);

  // Debounced draft value for auto-save (500ms delay)
  const debouncedDraft = useDebounce(draft, 500);

  // Auto-save draft when it changes
  useEffect(() => {
    if (loading) {
      return; // Don't save on initial load
    }
    const saveDraft = async () => {
      try {
        if (debouncedDraft.trim()) {
          await messageRepo.saveDraft(deviceId, type, targetId, debouncedDraft);
        } else {
          // Delete draft if empty
          await messageRepo.deleteDraft(deviceId, type, targetId);
        }
      } catch (error) {
        console.error("[useMessageDraft] Error saving draft:", error);
      }
    };

    saveDraft();
  }, [debouncedDraft, deviceId, type, targetId, loading]);

  // Clear draft (call after sending message)
  const clearDraft = useCallback(async () => {
    setDraft("");
    try {
      await messageRepo.deleteDraft(deviceId, type, targetId);
    } catch (error) {
      console.error("[useMessageDraft] Error clearing draft:", error);
    }
  }, [deviceId, type, targetId]);

  return { draft, setDraft, clearDraft, loading };
}
