// web/src/features/notifications/useNotifications.ts
// Now a thin consumer of the Notifications context to share state across UI

import { useNotificationsContext } from './NotificationsProvider';

export function useNotifications() {
  return useNotificationsContext();
}
