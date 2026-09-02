'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import { UploadCloud, Trash2, Loader2, ImageOff, Link2 } from 'lucide-react';
import { uploadImage, deleteUpload, ApiError } from '@/lib/api';
import { imageSrc } from '@/lib/format';
import { useToast } from '@/lib/toast';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml';
const MAX_MB = 5;

/**
 * Image picker for catalogue forms.
 *
 * The file is posted to our own Node API (`POST /admin/uploads`), multer writes
 * it to the server's `uploads/` folder and returns the public URL — no external
 * storage or third-party service is involved. Pasting a URL manually is still
 * supported for images that already live somewhere.
 */
export function ImageUpload({
  value,
  onChange,
  label,
}: {
  /** Absolute image URL currently stored on the record ('' when empty). */
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  // Remembers the file this component just uploaded so "Remove" can delete it
  // from disk instead of leaving an orphan behind.
  const [uploaded, setUploaded] = useState<string | null>(null);

  const send = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be uploaded');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image must be smaller than ${MAX_MB} MB`);
      return;
    }

    setBusy(true);
    setProgress(0);
    setBroken(false);
    try {
      const result = await uploadImage(file, setProgress);
      onChange(result.url);
      setUploaded(result.file);
      toast.success(`${result.name} uploaded`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async () => {
    const justUploaded = uploaded;
    onChange('');
    setUploaded(null);
    setBroken(false);
    if (justUploaded) {
      try {
        await deleteUpload(justUploaded);
      } catch {
        /* the record is already detached - a leftover file is not worth an error */
      }
    }
  };

  const src = imageSrc(value);

  return (
    <div className="space-y-2">
      {src ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-[var(--color-line)]">
          {broken ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1.5 bg-ink-50 text-ink-400">
              <ImageOff size={20} />
              <span className="text-[12.5px]">Image could not be loaded</span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="h-40 w-full bg-ink-50 object-cover" onError={() => setBroken(true)} />
          )}
          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2">
            <span className="truncate font-mono text-[11.5px] text-ink-400">{value}</span>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                aria-label="Remove image"
                className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)]"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void send(file);
          }}
          disabled={busy}
          aria-label={label ? `Upload ${label}` : 'Upload image'}
          className={clsx(
            'flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors',
            dragging ? 'border-brand-500 bg-brand-50' : 'border-[var(--color-line-strong)] bg-ink-50 hover:bg-ink-100',
            busy && 'cursor-wait',
          )}
        >
          {busy ? (
            <>
              <Loader2 size={20} className="spin text-brand-600" />
              <span className="text-[12.5px] font-medium text-ink-600 tabular">Uploading… {progress}%</span>
              <span className="h-1 w-40 overflow-hidden rounded-full bg-ink-200">
                <span className="block h-full bg-brand-600 transition-[width]" style={{ width: `${progress}%` }} />
              </span>
            </>
          ) : (
            <>
              <UploadCloud size={20} className="text-ink-400" />
              <span className="text-[13px] font-medium text-ink-700">Click or drop an image</span>
              <span className="text-[11.5px] text-ink-400">JPG, PNG, WebP, GIF or SVG · up to {MAX_MB} MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />

      {showUrl ? (
        <input
          value={value}
          placeholder="https://…"
          onChange={(event) => {
            setBroken(false);
            onChange(event.target.value);
          }}
          className="h-9 w-full rounded-lg bg-white px-3 text-[13px] text-ink-900 ring-1 ring-[var(--color-line-strong)] placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowUrl(true)}
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 transition-colors hover:text-ink-700"
        >
          <Link2 size={13} />
          Use an external URL instead
        </button>
      )}
    </div>
  );
}
