import { useState, useRef } from 'react';
import { Paperclip, Camera, Send } from 'lucide-react';

interface EvidenceComposerProps {
  onSend: (body: string, files?: File[]) => Promise<void>;
}

export function EvidenceComposer({ onSend }: EvidenceComposerProps) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed && files.length === 0) return;
    setSending(true);
    try {
      await onSend(trimmed, files.length > 0 ? files : undefined);
      setBody('');
      setFiles([]);
    } catch {
      // Error handled by parent
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  return (
    <div className="border-t border-[#E2DDD4]/60 px-4 py-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] bg-[#F7F5EE] border border-[#E2DDD4] rounded px-2 py-0.5"
            >
              <Paperclip size={8} />
              {f.name}
              <button
                type="button"
                onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                className="text-[#8A93A6] hover:text-[#C62828] ml-0.5"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add to the evidence trail…"
          rows={1}
          className="flex-1 resize-none text-xs border border-[#E2DDD4] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1E2D4D] bg-white"
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-1.5 text-[#8A93A6] hover:text-[#1E2D4D]"
            title="Attach file"
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="p-1.5 text-[#8A93A6] hover:text-[#1E2D4D]"
            title="Take photo"
          >
            <Camera size={14} />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || (!body.trim() && files.length === 0)}
            className="px-3 py-1.5 text-[10px] font-medium rounded-full bg-[#1E2D4D] text-white disabled:opacity-40"
          >
            {sending ? '...' : 'Add entry'}
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
