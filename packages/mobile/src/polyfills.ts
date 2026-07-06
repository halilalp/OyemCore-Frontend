// Force React Native core initialization first to load standard web polyfills
require('react-native/Libraries/Core/InitializeCore');

// Double-check and ensure Headers, Request, Response, and fetch are polyfilled
if (typeof global.Headers === 'undefined') {
  require('whatwg-fetch');
}

// Polyfill FormData for React Native 0.85+ / Bridgeless mode
if (typeof global.FormData === 'undefined') {
  const FormDataModule = require('react-native/Libraries/Network/FormData');
  global.FormData = FormDataModule.default || FormDataModule;
}

// Polyfill AbortSignal and AbortController if missing in the JS environment
class AbortSignalPolyfill {
  aborted = false;
  _listeners: any[] = [];
  addEventListener(type: string, listener: any) {
    if (type === 'abort') {
      this._listeners.push(listener);
    }
  }
  removeEventListener(type: string, listener: any) {
    if (type === 'abort') {
      this._listeners = this._listeners.filter(l => l !== listener);
    }
  }
}

class AbortControllerPolyfill {
  signal = new AbortSignalPolyfill();
  abort() {
    this.signal.aborted = true;
    this.signal._listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.warn('Error in abort listener:', e);
      }
    });
  }
}

if (typeof global.AbortSignal === 'undefined') {
  global.AbortSignal = AbortSignalPolyfill as any;
}

if (typeof global.AbortController === 'undefined') {
  global.AbortController = AbortControllerPolyfill as any;
}
