"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { cn } from "@/lib/utils";
import { Bell, X, Check, AlertCircle, Info, Loader2, Settings, MessageSquare, ShoppingCart, FileText, Users, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LottieIcon, LottieAnimation } from "@/components/ui/lottie";
import { getAnimationConfig } from "@/components/ui/lottie/animations";

export type NotificationType = "info" | "success" | "warning" | "error" | "action_required";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, unknown>;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  info: { icon: <Info className="h-4 w-4" />, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
  success: { icon: <Check className="h-4 w-4" />, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  warning: { icon: <AlertCircle className="h-4 w-4" />, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  error: { icon: <AlertCircle className="h-4 w-4" />, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  action_required: { icon: <Zap className="h-4 w-4" />, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
};

interface SmartNotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const SmartNotificationsContext = createContext<SmartNotificationsContextType | undefined>(undefined);

export function SmartNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("smart-notifications");
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })));
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("smart-notifications", JSON.stringify(notifications));
    }
  }, [notifications, isInitialized]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
    return id;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SmartNotificationsContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
    }}>
      {children}
    </SmartNotificationsContext.Provider>
  );
}

export function useSmartNotifications() {
  const context = useContext(SmartNotificationsContext);
  if (!context) {
    throw new Error("useSmartNotifications must be used within a SmartNotificationsProvider");
  }
  return context;
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useSmartNotifications();
  const [open, setOpen] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const filteredNotifications = showOnlyUnread 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleActionClick = (notification: Notification) => {
    notification.action?.onClick();
    markAsRead(notification.id);
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
      >
        <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-primary")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      {open && (
        <div
          className="fixed right-4 top-16 z-50 w-96 max-h-[70vh] rounded-xl border border-border bg-card shadow-lg animate-fade-in"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                <p className="text-xs text-muted-foreground">{notifications.length} total • {unreadCount} unread</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                aria-pressed={showOnlyUnread}
              >
                <MessageSquare className={cn("h-4 w-4", showOnlyUnread && "text-primary")} />
                <span className="sr-only">{showOnlyUnread ? "Show all" : "Show unread only"}</span>
              </Button>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[calc(70vh-100px)]">
            <div className="p-2 space-y-1">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <LottieIcon src="emptyState" size={40} className="text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mt-2">No notifications</p>
                  <p className="text-xs text-muted-foreground/60">You're all caught up!</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "group relative rounded-lg border p-3 transition-all duration-150",
                        notification.read ? "opacity-70" : "bg-muted/30",
                        config.bg,
                        config.border
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", config.bg)}>
                          <LottieIcon 
                            src={notification.type === "success" ? "saveSuccess" : notification.type === "error" ? "errorState" : "syncComplete"}
                            size={18}
                            className={config.color}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-sm font-medium truncate", config.color)}>{notification.title}</h4>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {notification.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                          {notification.action && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-7 text-[11px]"
                              onClick={() => handleActionClick(notification)}
                            >
                              {notification.action.label}
                            </Button>
                          )}
                        </div>
                        {!notification.read && (
                          <div className={cn("flex h-2 w-2 shrink-0 rounded-full mt-1", config.color.replace("text-", "bg-"))} />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
                          aria-label="Dismiss"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-border/50" />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={clearAll}>
                Clear all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { Zap } from "lucide-react";

export function NotificationToast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const config = typeConfig[notification.type];
  
  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 flex items-start gap-3 w-80 max-w-[calc(100vw-1rem)] rounded-lg border p-4 shadow-lg animate-slide-up",
      config.bg,
      config.border
    )} role="alert" aria-live="polite">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
        <LottieIcon 
          src={notification.type === "success" ? "saveSuccess" : notification.type === "error" ? "errorState" : "syncComplete"}
          size={20}
          className={config.color}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn("text-sm font-medium truncate", config.color)}>{notification.title}</h4>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
        {notification.action && (
          <Button variant="outline" size="sm" className="mt-2 h-7 text-[11px]" onClick={() => { notification.action?.onClick(); onClose(); }}>
            {notification.action.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationToaster() {
  const { notifications } = useSmartNotifications();
  const unreadNotifications = notifications.filter(n => !n.read).slice(0, 3);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {unreadNotifications.map((notification, index) => (
        <div key={notification.id} style={{ animationDelay: `${index * 100}ms` }} className="pointer-events-auto">
          <NotificationToast notification={notification} onClose={() => {}} />
        </div>
      ))}
    </div>
  );
}