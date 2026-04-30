import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AVAILABLE_MODELS, getModelsByProvider } from "@/lib/multiModel";

interface ModelPickerProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ModelPicker({ value, onChange, className }: ModelPickerProps) {
  const grouped = getModelsByProvider();
  const current = AVAILABLE_MODELS.find((m) => m.id === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select model">
          {current?.label ?? "Select model"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Lovable AI Gateway</SelectLabel>
          {grouped.lovable.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Anthropic (Direct)</SelectLabel>
          {grouped.anthropic.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Google Gemini (Direct)</SelectLabel>
          {grouped.gemini.map((m) => (
            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
