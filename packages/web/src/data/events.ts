/**
 * Event system for database changes
 * Allows components to react to database updates
 */

type EventCallback = () => void;

class DatabaseEvents {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  emit(event: string): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback();
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const dbEvents = new DatabaseEvents();

export const DB_EVENTS = {
  MESSAGE_SAVED: "message:saved",
  NODE_UPDATED: "node:updated",
  POSITION_UPDATED: "position:updated",
  TELEMETRY_UPDATED: "telemetry:updated",
  CHANNEL_UPDATED: "channel:updated",
  TRACEROUTE_COMPLETED: "traceroute:completed",
  PREFERENCE_UPDATED: "preference:updated",
} as const;
