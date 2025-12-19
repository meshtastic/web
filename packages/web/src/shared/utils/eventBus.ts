export type EventMap = {
  "dialog:unsafeRoles": {
    action: "confirm" | "dismiss";
  };
};

export type EventName = keyof EventMap;
export type EventCallback<T extends EventName> = (data: EventMap[T]) => void;

class EventBus {
  private listeners: { [K in EventName]?: Array<EventCallback<K>> } = {};

  public on<T extends EventName>(
    event: T,
    callback: EventCallback<T>,
  ): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event]?.push(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off<T extends EventName>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners[event]) {
      return;
    }

    const callbackIndex = this.listeners[event]?.indexOf(callback);
    if (callbackIndex !== undefined && callbackIndex > -1) {
      this.listeners[event]?.splice(callbackIndex, 1);
    }
  }

  public offAll<T extends EventName>(event?: T): void {
    if (event) {
      this.listeners[event] = [];
    } else {
      this.listeners = {};
    }
  }

  public emit<T extends EventName>(event: T, data: EventMap[T]): void {
    if (!this.listeners[event]) {
      return;
    }

    this.listeners[event]?.forEach((callback) => {
      callback(data);
    });
  }
}

export const eventBus = new EventBus();
