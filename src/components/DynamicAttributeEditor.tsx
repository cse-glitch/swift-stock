import type { AttributeField } from '@/lib/business-config';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DynamicAttributeEditorProps {
  fields: AttributeField[];
  values: Record<string, string | number | boolean>;
  onChange: (values: Record<string, string | number | boolean>) => void;
}

export function DynamicAttributeEditor({ fields, values, onChange }: DynamicAttributeEditorProps) {
  function setValue(key: string, value: string | number | boolean) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Business-Specific Attributes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {field.type === 'text' && (
              <Input
                value={(values[field.key] as string) ?? ''}
                onChange={e => setValue(field.key, e.target.value)}
                placeholder={field.label}
                className="h-9"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={(values[field.key] as number) ?? ''}
                onChange={e => setValue(field.key, Number(e.target.value))}
                placeholder="0"
                className="h-9"
              />
            )}

            {field.type === 'select' && (
              <Select value={(values[field.key] as string) ?? ''} onValueChange={v => setValue(field.key, v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={!!values[field.key]}
                  onCheckedChange={v => setValue(field.key, v)}
                />
                <span className="text-sm text-muted-foreground">{values[field.key] ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
