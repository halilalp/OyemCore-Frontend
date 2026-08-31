class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  addListener(eventType, listener, context) {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    
    const handler = context ? listener.bind(context) : listener;
    this.listeners[eventType].push(handler);

    return {
      remove: () => {
        this.removeListener(eventType, handler);
      }
    };
  }

  removeListener(eventType, listener) {
    if (!this.listeners[eventType]) return;
    this.listeners[eventType] = this.listeners[eventType].filter(l => l !== listener);
  }

  emit(eventType, ...args) {
    if (!this.listeners[eventType]) return;
    this.listeners[eventType].forEach(listener => {
      try {
        listener(...args);
      } catch (e) {
        console.error('Error in EventEmitter listener:', e);
      }
    });
  }

  removeAllListeners(eventType) {
    if (eventType) {
      delete this.listeners[eventType];
    } else {
      this.listeners = {};
    }
  }
}

module.exports = EventEmitter;
