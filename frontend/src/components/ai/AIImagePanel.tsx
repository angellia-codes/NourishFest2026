import { useState } from 'react';
import { ImagePlus, Loader2, Save, RotateCcw } from 'lucide-react';
import { useAIImage, useSaveGeneratedImage } from '@/hooks/useAIGenerate';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Primitives';
import type { AIKind } from '@/types';

interface AIImagePanelProps {
  kind: Extract<AIKind, 'theme' | 'decoration'>;
  label: string;
  linkedModule?: string;
  linkedRecordId?: string;
}

/**
 * Image-generation widget. Generates a preview only (nothing written to
 * Drive yet) — the organizer explicitly saves the ones worth keeping,
 * which files them into the Documents vault as DocType='Design'.
 * Owner/Admin only, same as AIPromptBox.
 */
export function AIImagePanel({ kind, label, linkedModule, linkedRecordId }: AIImagePanelProps) {
  const { can, loading } = usePermissions();
  const { generate, image, isGenerating, error } = useAIImage();
  const { save, isSaving } = useSaveGeneratedImage();
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!loading && !can('AI', 'Admin')) return null;

  const run = () => {
    setSaved(false);
    generate({ kind, prompt });
  };

  const handleSave = async () => {
    if (!image) return;
    await save({
      imageBase64: image.imageBase64,
      mimeType: image.mimeType,
      title: prompt || `AI ${kind} concept`,
      linkedModule,
      linkedRecordId,
    });
    setSaved(true);
  };

  return (
    <div className="rounded-lg border border-dashed border-mango/40 bg-mango/5 p-3 space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700"
      >
        <ImagePlus className="h-3.5 w-3.5" /> {label}
      </button>

      {expanded && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the look — colors, mood, setting…"
              className="!py-1.5 text-sm"
            />
            <Button size="sm" onClick={run} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Generate
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error.message}</p>}

          {image && (
            <div className="space-y-2">
              <img
                src={`data:${image.mimeType};base64,${image.imageBase64}`}
                alt="AI-generated concept"
                className="rounded-lg border border-ink/10 max-h-64 object-contain"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={handleSave} disabled={isSaving || saved}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saved ? 'Saved to Documents' : 'Save to Documents'}
                </Button>
                <Button size="sm" variant="ghost" onClick={run} disabled={isGenerating}>
                  <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
