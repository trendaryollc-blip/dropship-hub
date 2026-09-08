"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Loader2, X, Upload } from "lucide-react";

interface VisualSearchButtonProps {
  onSearch: (query: string) => void;
  className?: string;
}

export default function VisualSearchButton({
  onSearch,
  className = "",
}: VisualSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/search/visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });

      if (!res.ok) throw new Error("Visual search failed");

      const data = await res.json();
      if (data.query) {
        onSearch(data.query);
        setIsOpen(false);
        setPreview(null);
      } else {
        setError("Could not identify product from image");
      }
    } catch {
      setError("Visual search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors ${className}`}
        title="Search by image"
        data-testid="visual-search-button"
      >
        <Camera className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setIsOpen(false); setPreview(null); setError(null); }} role="dialog" aria-modal="true" aria-label="Visual Search">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-accent" />
                <h3 className="text-white font-bold">Search by Image</h3>
              </div>
              <button onClick={() => { setIsOpen(false); setPreview(null); setError(null); }} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-accent/30 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="drop-zone"
                >
                  <Upload className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-1">Drop an image here or click to upload</p>
                  <p className="text-gray-600 text-xs">JPG, PNG, WebP up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-xl bg-white/5" />
                    <button
                      onClick={() => setPreview(null)}
                      className="absolute top-2 right-2 p-1 bg-black/60 rounded-lg text-white hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {error && (
                    <p className="text-red-400 text-xs text-center">{error}</p>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Search for this product
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && preview && (
                <p className="text-red-400 text-xs text-center mt-2">{error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
