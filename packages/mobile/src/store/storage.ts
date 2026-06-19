import { Platform } from 'react-native';

let AsyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

if (Platform.OS === 'web') {
  AsyncStorage = {
    getItem: async (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    setItem: async (key: string, value: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    }
  };
} else {
  // Use dynamic require to prevent native module instantiation on web
  const nativeModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = nativeModule.default || nativeModule;
}

export default AsyncStorage;
