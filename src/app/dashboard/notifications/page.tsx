"use client";

import { useState, useEffect, useCallback } from "react";
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
  Loader2,
  Filter,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import DropdownFilter from "@/app/components/DropdownFilter";

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
      return <Megaphone className="h-5 w-5 text-blue-500" />;
    case "registration":
    case "approval":
      return <ClipboardCheck className="h-5 w-5 text-emerald-500" />;
    case "result":
      return <GraduationCap className="h-5 w-5 text-amber-500" />;
    case "routine":
      return <CalendarClock className="h-5 w-5 text-indigo-500" />;
    case "calendar":
      return <CalendarDays className="h-5 w-5 text-teal-500" />;
    case "account":
    case "system":
      return <ShieldAlert className="h-5 w-5 text-rose-500" />;
    default:
      return <Bell className="h-5 w-5 text-slate-500" />;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (reset = false) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          limit: "25",
        });
        if (filter === "unread") {
          queryParams.set("unreadOnly", "1");
        }
        if (!reset && cursor) {
          queryParams.set("before", cursor);
        }

        const res = await fetch(`/api/notifications?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (reset) {
            setNotifications(data.notifications || []);
          } else {
            setNotifications((prev) => [...prev, ...(data.notifications || [])]);
          }
          setUnreadCount(data.unreadCount || 0);
          setHasMore(data.hasMore || false);
          if (data.notifications && data.notifications.length > 0) {
            setCursor(data.notifications[data.notifications.length - 1].createdAt);
          }
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [filter, cursor]
  );

  useEffect(() => {
    setCursor(null);
    fetchNotifications(true);
  }, [filter]);

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

  const handleMarkOneRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const categoryOptions = [
    { label: "All Categories", value: "all" },
    { label: "Notices", value: "notice" },
    { label: "Class Routine", value: "routine" },
    { label: "Registration & Forms", value: "registration" },
    { label: "Academic Results", value: "result" },
    { label: "Academic Calendar", value: "calendar" },
    { label: "Approvals", value: "approval" },
    { label: "System & Accounts", value: "system" },
  ];

  const displayedNotifications =
    categoryFilter === "all"
      ? notifications
      : notifications.filter((n) => n.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Notifications Center
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Real-time updates, notices, academic deadlines, and activity for your role.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-ruet-blue/10 px-4 py-2.5 text-xs font-bold text-ruet-blue hover:bg-ruet-blue/20 dark:bg-ruet-gold/10 dark:text-ruet-gold dark:hover:bg-ruet-gold/20 transition-colors"
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filter === "all"
                ? "bg-ruet-blue text-white shadow-sm dark:bg-ruet-gold dark:text-black"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              filter === "unread"
                ? "bg-ruet-blue text-white shadow-sm dark:bg-ruet-gold dark:text-black"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="w-full sm:w-auto">
          <DropdownFilter
            icon={<Filter size={14} />}
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-3" size={28} />
            <p className="text-sm">Loading your notifications...</p>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/30 p-12 text-center dark:border-white/10 dark:bg-black/10">
            <div className="rounded-full bg-slate-100 p-4 dark:bg-white/5 mb-3">
              <CheckCircle2 size={32} className="text-ruet-blue dark:text-ruet-gold" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">All Caught Up</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {filter === "unread"
                ? "You have read all your notifications!"
                : "No notifications have been recorded yet."}
            </p>
          </div>
        ) : (
          displayedNotifications.map((notif) => (
            <div
              key={notif._id}
              className={`glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 transition-all ${
                !notif.isRead
                  ? "border-ruet-blue/30 bg-blue-50/20 dark:border-ruet-gold/30 dark:bg-blue-950/10 shadow-sm"
                  : "hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0 rounded-2xl bg-white p-3 shadow-sm dark:bg-white/5">
                  {getCategoryIcon(notif.category)}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`text-sm ${
                        !notif.isRead
                          ? "font-bold text-slate-900 dark:text-white"
                          : "font-semibold text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {notif.title}
                      {notif.count && notif.count > 1 ? ` (${notif.count})` : ""}
                    </h3>
                    {!notif.isRead && (
                      <span className="rounded-full bg-ruet-blue/10 px-2 py-0.5 text-[10px] font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-slate-400">{timeAgo(notif.createdAt)}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {!notif.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkOneRead(notif._id)}
                    className="rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:text-slate-300 dark:hover:bg-white/5 transition-colors"
                  >
                    Mark read
                  </button>
                )}

                {notif.link && (
                  <Link
                    href={notif.link}
                    onClick={() => {
                      if (!notif.isRead) handleMarkOneRead(notif._id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-ruet-blue px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 transition-colors"
                  >
                    <span>View</span>
                    <ExternalLink size={13} />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <div className="pt-4 text-center">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => fetchNotifications(false)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Loading more...</span>
                </>
              ) : (
                <span>Load More</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
