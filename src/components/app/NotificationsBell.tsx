import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { listMyNotifications, markAllNotificationsRead, markNotificationRead, NotificationRow } from "@/lib/firmWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const unread = items.filter((n) => !n.is_read).length;

  const refresh = () => listMyNotifications(50).then(setItems);

  useEffect(() => {
    if (!user) return;
    refresh();
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const handleClick = async (n: NotificationRow) => {
    if (!n.is_read) await markNotificationRead(n.id);
    if (n.link_path) navigate(n.link_path);
    refresh();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={async () => {
                await markAllNotificationsRead();
                refresh();
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto divide-y">
          {items.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted ${!n.is_read ? "bg-primary/5" : ""}`}
            >
              <div className="flex gap-2 items-baseline">
                <span className="font-medium">{n.title}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
              {n.body && <div className="mt-0.5 text-muted-foreground line-clamp-2">{n.body}</div>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
