import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  formatRequestDate,
} from "@/lib/serviceRequestUtils";

/**
 * Document list + upload button for a ServiceRequest.
 * Owns its own uploading state.
 *
 * PRESERVES T2.5 QUICK FIX: before appending to the documents array, we
 * refetch the fresh ServiceRequest record and append to THAT. Without this,
 * a concurrent comment or document from the other party would be silently
 * overwritten. See src/lib/serviceRequestUtils.js and T2.5 in the audit.
 *
 * Props:
 *   request       - current ServiceRequest record
 *   currentUser   - current user (for uploaded_by attribution)
 *   onUpdated     - (updatedRequest) => void, called after successful upload
 *                   so the parent can sync its selected-request reference
 */
export default function DocumentsSection({ request, currentUser, onUpdated }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !request || !currentUser) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is too large. Maximum size is 25 MB.");
      e.target.value = '';
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("File type not allowed. Please upload a PDF, image, Word, or Excel file.");
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const doc = {
        name: file.name,
        url: file_url,
        uploaded_by: currentUser.full_name,
        uploaded_at: new Date().toISOString(),
      };
      // T2.5 quick fix — refetch-before-write to avoid clobbering
      // concurrent additions from the other party.
      const fresh = (await base44.entities.ServiceRequest.filter({ id: request.id }))[0];
      if (!fresh) {
        toast.error("This request could not be found. It may have been deleted.");
        return;
      }
      const updated = await base44.entities.ServiceRequest.update(request.id, {
        documents: [...(fresh.documents || []), doc],
      });
      onUpdated?.(updated);
      queryClient.invalidateQueries({ queryKey: ['ServiceRequest'] });
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const documents = request?.documents || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-navy text-sm">Documents</h4>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-teal font-semibold hover:opacity-80 transition-opacity"
            aria-label="Upload a document"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, i) => (
            <a
              key={i}
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-teal/40 hover:bg-teal/5 transition-all group"
            >
              <FileText className="w-4 h-4 text-teal flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  by {doc.uploaded_by} · {formatRequestDate(doc.uploaded_at)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
