"use client";

import {
  Bell,
  Ticket,
  UserPlus,
  Users,
  CreditCard,
  CheckCircle,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import { ApiClient as API } from "@/lib/api-client";
import { IconButton } from "@/components/shared/IconButton";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  description?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: string | Date;
}

const INITIAL_NOTIFICATIONS: Notification[] = [];

const typeIcon: Record<Notification["type"], React.ElementType> = {
  booking: Ticket,
  lead: UserPlus,
  customer: Users,
  expense: CreditCard,
  system: CheckCircle,
  info: CheckCircle,
  success: CheckCircle,
  warning: CheckCircle,
  error: CheckCircle,
  receipt: CreditCard,
};

const typeColor: Record<Notification["type"], string> = {
  booking: "text-tf-primary bg-tf-primary-soft",
  lead: "text-[var(--tf-warning)] bg-[var(--tf-warning-soft)]",
  customer: "text-tf-success bg-[var(--tf-success-soft)]",
  expense: "text-tf-danger bg-[var(--tf-danger-soft)]",
  system: "text-[var(--tf-info)] bg-[var(--tf-info-soft)]",
  info: "text-[var(--tf-info)] bg-[var(--tf-info-soft)]",
  success: "text-tf-success bg-[var(--tf-success-soft)]",
  warning: "text-[var(--tf-warning)] bg-[var(--tf-warning-soft)]",
  error: "text-tf-danger bg-[var(--tf-danger-soft)]",
  receipt: "text-tf-success bg-[var(--tf-success-soft)]",
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(
    INITIAL_NOTIFICATIONS,
  );
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await API.getNotifications(1, 20);
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await API.markAllNotificationsRead();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    setIsOpen(false);

    // Fallback links if entityType is known but href is missing from backend
    let href = notification.href || "/dashboard";
    if (notification.entityType === "lead" && notification.entityId) href = `/leads/${notification.entityId}`;
    if (notification.entityType === "booking" && notification.entityId) href = `/bookings/${notification.entityId}`;
    if (notification.entityType === "receipt" && notification.entityId) href = `/receipts`;

    router.push(href);

    if (!notification.read) {
      try {
        await API.markNotificationRead(notification.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const dismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await API.deleteNotification(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--tf-danger)] text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </IconButton>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-tf-border bg-tf-surface shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-tf-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-tf-text-primary">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-tf-primary text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={markAllRead}
                className="h-auto p-0 text-xs font-medium normal-case tracking-normal"
              >
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--tf-border)]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-tf-text-muted">
                No notifications
              </div>
            ) : (
              notifications.map((notification: any) => {
                const Icon = typeIcon[notification.type as keyof typeof typeIcon] || Bell;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-tf-surface-2 transition-colors group ${!notification.read ? "bg-tf-primary-soft/30" : ""
                      }`}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-tf-primary" />
                    )}

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${typeColor[notification.type as keyof typeof typeColor] || typeColor.info}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${!notification.read ? "text-tf-text-primary" : "text-tf-text-secondary"}`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-tf-text-muted truncate mt-0.5">
                        {notification.body || notification.description}
                      </p>
                      <p className="text-[10px] text-tf-text-muted mt-1">
                        {formatTimeAgo(new Date(notification.createdAt))}
                      </p>
                    </div>

                    <IconButton
                      onClick={(e) => dismissNotification(e, notification.id)}
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 shrink-0"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3 w-3" />
                    </IconButton>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-tf-border px-4 py-2.5">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                router.push("/reports");
              }}
              className="w-full h-auto p-0 text-xs font-medium normal-case tracking-normal"
            >
              View all activity →
            </Button>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
