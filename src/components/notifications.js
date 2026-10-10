export const NOTIFICATION_EVENT = 'terigent:notification';
let nextId = 0;

export function showNotification(message, options = {}) {
  if (!message || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
    detail: {
      id: ++nextId,
      message,
      type: options.type || 'info',
      duration: options.duration,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    },
  }));
}
