import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAIText } from '@/hooks/useAIGenerate';
import { usePermissions } from '@/context/PermissionContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Primitives';
import type { AIKind } from '@/types';

interface AIPromptBoxProps {
  kind: AIKind;
  label: string; // e.g. "AI theme ideas"
  placeholder?: string;
  onPick: (suggestion: string) => void;
}

/**
 * Text-generation widget. Renders nothing for anyone without Admin on the
 * 'AI' permission module — per the owner/admin-only requirement. The
 * backend independently re-checks this, so hiding the box is UX only.
 */
export function AIPromptBox({ kind, label, placeholder, onPick }: AIPromptBoxProps) {
  const { can, loading } = usePermissions();
  const { generate, suggestions, isGenerating, error, reset } = useAIText();
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);

  if (!loading && !can('AI', 'Admin')) return null;

  const run = () => generate({ kind, prompt });

  return (
    <div className="rounded-lg border border-dashed border-guava/30 bg-guava/5 p-3 space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-guava"
      >
        <Sparkles className="h-3.5 w-3.5" /> {label}
      </button>

      {expanded && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder ?? 'Optional vibe/keywords…'}
              className="!py-1.5 text-sm"
            />
            <Button size="sm" onClick={run} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generate
            </Button>
          </div>
          {error && <p className="text-xs text-red-600">{error.message}</p>}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onPick(s);
                    reset();
                    setExpanded(false);
                  }}
                  className="text-xs rounded-full border border-guava/30 bg-white px-2.5 py-1 hover:bg-guava/10 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
