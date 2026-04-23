import { useRef, useState } from "react";
import { Send, Paperclip, X, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Message composer: textarea + attachment chips + file upload + send button.
 *
 * Owns its own state:
 *   - newMessage (draft text)
 *   - attachments (uploaded file list)
 *   - sending (in-flight send flag)
 *   - uploading (in-flight file upload flag)
 *
 * The parent doesn't need to know any of this. We only surface the send
 * side-effects — the realtime subscription in useThreadMessages takes care
 * of updating the message list optimistically.
 *
 * Props:
 *   thread       - current MessageThread (required to know thread.id,
 *                  participants, etc.)
 *   currentUser  - current user (sender attribution)
 */
export default function MessageComposer({ thread, currentUser }) {
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 25 MB.");
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAttachments(prev => [...prev, { name: file.name, url: file_url }]);
    } catch {
      toast.error("File upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !thread || !currentUser) return;
    setSending(true);
    try {
      await base44.entities.Message.create({
        thread_id: thread.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        content: newMessage.trim(),
        file_urls: attachments.map(a => a.url),
        file_names: attachments.map(a => a.name),
      });
      const otherParticipants = thread.participants.filter(id => id !== currentUser.id);
      await base44.entities.MessageThread.update(thread.id, {
        last_message: newMessage.trim() || `[${attachments.length} file(s)]`,
        last_message_at: new Date().toISOString(),
        unread_by: otherParticipants,
      });
      setNewMessage("");
      setAttachments([]);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, j) => j !== idx));
  };

  return (
    <>
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 text-xs border border-border">
              <FileText className="w-3 h-3 text-teal" />
              <span className="max-w-[100px] truncate">{a.name}</span>
              <button onClick={() => removeAttachment(i)} aria-label={`Remove ${a.name}`}>
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive ml-1" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 border-t border-border flex items-end gap-2 bg-card">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-teal flex-shrink-0"
          aria-label="Attach a file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <Textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a message… (Enter to send)"
          className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={sending || (!newMessage.trim() && attachments.length === 0)}
          className="gradient-primary text-white p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0 hover:opacity-90 transition-opacity"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
