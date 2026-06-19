import { create } from 'zustand';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  showAlert: (title: string, message: string, type?: AlertType) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  type: 'info',
  onConfirm: null,
  onCancel: null,
  showAlert: (title, message, type = 'info') => set({
    visible: true,
    title,
    message,
    type,
    onConfirm: null,
    onCancel: null
  }),
  showConfirm: (title, message, onConfirm, onCancel) => set({
    visible: true,
    title,
    message,
    type: 'confirm',
    onConfirm,
    onCancel: onCancel || null
  }),
  hideAlert: () => set({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null
  })
}));
