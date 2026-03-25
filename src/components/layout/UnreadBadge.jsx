import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function UnreadBadge({ userId }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const calc = async () => {
      const threads = await base44.entities.MessageThread.list('-last_message_at', 200);
      const unread = threads.filter(t =>
        t.participants?.includes(userId) && t.unread_by?.includes(userId)
      );
      setCount(unread.length);
    };
    calc();
    const unsub = base44.entities.MessageThread.subscribe(calc);
    return unsub;
  }, [userId]);

  if (!count) return null;

  return (
    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] min-h-[18px] gradient-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
      {count > 9 ? "9+" : count}
    </span>
  );
}