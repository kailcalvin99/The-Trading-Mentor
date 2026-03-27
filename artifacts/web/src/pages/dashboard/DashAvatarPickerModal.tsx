import { useRef, useState, type ChangeEvent } from "react";
import { Camera, X } from "lucide-react";
import { DASH_STOCK_AVATARS } from "./LiveSignalWidgets";

export function resizeDashImageToBase64(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function DashAvatarPickerModal({
  user,
  onClose,
  onSelect,
}: {
  user: { avatarUrl?: string | null; name?: string | null } | null | undefined;
  onClose: () => void;
  onSelect: (val: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await resizeDashImageToBase64(file);
      await onSelect(b64);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Choose Avatar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {DASH_STOCK_AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.emoji)}
              className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center border transition-all ${
                user?.avatarUrl === a.emoji ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50 bg-secondary"
              }`}
              title={a.label}
            >
              {a.emoji}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
          {user?.avatarUrl && (
            <button onClick={() => onSelect("")} className="px-3 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
