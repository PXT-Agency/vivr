import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-foreground text-xs font-medium">{label}</span>
      {children}
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  name,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <Input
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      required={required}
    />
  );
}

export function TextAreaField({
  name,
  defaultValue,
  placeholder,
  maxLength,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <Textarea
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      maxLength={maxLength}
    />
  );
}

export function SelectField({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="h-9 w-full rounded-md border bg-transparent px-3 text-sm transition-colors"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ColorField({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  return (
    <input
      type="color"
      name={name}
      defaultValue={defaultValue}
      className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1"
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}