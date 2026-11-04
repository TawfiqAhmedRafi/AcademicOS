"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Megaphone,
  ClipboardCheck,
  GraduationCap,
  CalendarClock,
  CalendarDays,
  ShieldAlert,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  category: string;
  link?: string;
  count?: number;
  createdAt: string;
  isRead: boolean;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "notice":
      return <Megaphone className="h-4 w-4 text-blue-500" />;
    case "registration":
    case "approval":
      return <ClipboardCheck className="h-4 w-4 text-emerald-500" />;
    case "result":
      return <GraduationCap className="h-4 w-4 text-amber-500" />;
    case "routine":
      return <CalendarClock className="h-4 w-4 text-indigo-500" />;
    case "calendar":
      return <CalendarDays className="h-4 w-4 text-teal-500" />;
    case "account":
    case "system":
      return <ShieldAlert className="h-4 w-4 text-rose-500" />;
    default:
      return <Bell className="h-4 w-4 text-slate-500" />;
  }
}

export default function NotificationBell({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch only the count (cheap, for 60s poll)
  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?countOnly=1");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore network errors in background poll
    }
  }, []);

  // Fetch full recent notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial count fetch + 60s background polling + focus event
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);

    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCount]);

  // When dropdown opens, load notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Click outside and Escape key to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notif._id }),
      }).catch(() => {});
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5 focus:outline-none"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm animate-in zoom-in-50 duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`fixed sm:absolute z-50 mt-2 left-4 right-4 sm:left-auto sm:right-0 sm:w-96 rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/95 animate-in fade-in slide-in-from-top-2 duration-200 ${
            align === "left" ? "sm:!left-0 sm:!right-auto" : "sm:!right-0 sm:!left-auto"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-ruet-blue/10 px-2 py-0.5 text-[11px] font-semibold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="animate-spin mb-2" size={20} />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="rounded-full bg-slate-100 p-3 dark:bg-white/5 mb-3">
                  <Bell className="text-slate-400" size={22} />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No notifications</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  You are all caught up for today!
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif._id}
                  type="button"
                  onClick={() => handleItemClick(notif)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 ${
                    !notif.isRead
                      ? "bg-blue-50/40 dark:bg-blue-950/20"
                      : "bg-transparent"
                  }`}
                >
                  {/* Category Icon */}
                  <div className="mt-0.5 shrink-0 rounded-xl bg-slate-100 p-2 dark:bg-white/5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !notif.isRead
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-semibold text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {notif.title}
                        {notif.count && notif.count > 1 ? ` (${notif.count})` : ""}
                      </p>
                      <span className="text-[10px] shrink-0 text-slate-400">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ruet-blue dark:bg-ruet-gold" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-2 text-center dark:border-white/5 bg-slate-50/50 dark:bg-black/20 rounded-b-2xl">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-ruet-blue hover:underline dark:text-ruet-gold"
            >
              <span>View all notifications</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
