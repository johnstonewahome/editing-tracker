"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const assignedCount = useQuery(api.notifications.assignedVideoCount);
  const notifications = useQuery(api.notifications.listNotifications);
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  const unreadCount =
    notifications?.filter((notification) => notification.readAt === undefined)
      .length ?? 0;

  const badgeCount = assignedCount ?? 0;
  const showBadge = badgeCount > 0;

  const handleNotificationClick = async (
    notificationId: Id<"notifications">,
    videoId: Id<"videos">,
  ) => {
    await markRead({ notificationId });
    router.push(`/videos/${videoId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Video assignments"
        >
          <Bell className="size-5" />
          {showBadge && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {badgeCount > 99 ? "99+" : badgeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Assigned videos</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-normal text-primary hover:underline"
              onClick={() => void markAllRead({})}
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications === undefined ? (
          <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">
            {showBadge
              ? `You have ${badgeCount} active video${badgeCount === 1 ? "" : "s"} assigned.`
              : "No assignment notifications yet."}
          </DropdownMenuItem>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <DropdownMenuItem
              key={notification._id}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1 py-2",
                notification.readAt === undefined && "bg-muted/50",
              )}
              onClick={() =>
                void handleNotificationClick(
                  notification._id,
                  notification.videoId,
                )
              }
            >
              <span className="text-sm font-medium">{notification.videoTitle}</span>
              <span className="text-xs text-muted-foreground">
                Assigned by {notification.actorUsername}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(notification.createdAt).toLocaleString()}
              </span>
            </DropdownMenuItem>
          ))
        )}
        {showBadge && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard">View dashboard</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
