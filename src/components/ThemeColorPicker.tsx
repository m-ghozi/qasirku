import { THEME_COLORS, getThemeHSL, useThemeColor } from '@/hooks/use-theme-color';
import { cn } from '@/lib/utils';
import { Check, Loader2 } from 'lucide-react';

interface ThemeColorPickerProps {
  /** Jika disuplai dari luar (controlled). Jika tidak, pakai internal hook. */
  value?: string;
  onChange?: (hue: string) => void;
}

export default function ThemeColorPicker({ value, onChange }: ThemeColorPickerProps) {
  const { hue: internalHue, setHue, isPending } = useThemeColor();

  const activeHue = value ?? internalHue;
  const handleChange = onChange ?? setHue;

  return (
    <div className="flex flex-wrap gap-3">
      {THEME_COLORS.map(color => {
        const isActive = activeHue === color.hue;
        const hsl = getThemeHSL(color.hue);

        return (
          <button
            key={color.hue}
            onClick={() => handleChange(color.hue)}
            disabled={isPending}
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all border-2',
              isActive
                ? 'scale-110 shadow-lg border-foreground/30'
                : 'border-transparent hover:scale-105',
              isPending && 'opacity-60 cursor-not-allowed'
            )}
            style={{ backgroundColor: `hsl(${hsl})` }}
            title={color.name}
          >
            {isActive && (
              isPending
                ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                : <Check className="w-5 h-5 text-white drop-shadow" />
            )}
          </button>
        );
      })}
    </div>
  );
}