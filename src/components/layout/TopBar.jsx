import { Bell, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function TopBar({ user }) {
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search deals, members, messages..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal rounded-full" />
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