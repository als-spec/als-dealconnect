import { Bell, Search, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TopBar({ user, onMobileMenuToggle }) {
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  // Unread message threads
  const { data: threads = [] } = useQuery({
    queryKey: ['MessageThread', 'unread', user?.id],
    queryFn: () => base44.entities.MessageThread.list('-last_message_at', 200),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  const unreadMessages = threads.filter(t =>
    t.participants?.includes(user?.id) && t.unread_by?.includes(user?.id)
  ).length;

  // Open support tickets (admins see all open; members see their own)
  const { data: tickets = [] } = useQuery({
    queryKey: ['SupportTicket', 'open', user?.id, user?.role],
    queryFn: () => base44.entities.SupportTicket.filter({ status: "open" }),
    enabled: !!user?.id,
    refetchInterval: 60000,
  });
  const openTickets = user?.role === "admin"
    ? tickets.length
    : tickets.filter(t => t.reported_by_user_id === user?.id).length;

  const totalNotifications = unreadMessages + openTickets;

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors mr-1"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search deals, members, messages..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {totalNotifications > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 gradient-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </span>
          )}
        </button>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 border-2 border-teal/30">
            <AvatarFallback className="bg-navy text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-navy leading-none">{user?.full_name || "Member"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.company_name || ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}