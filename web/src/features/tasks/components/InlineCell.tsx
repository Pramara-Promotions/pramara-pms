import { useEffect, useRef, useState } from "react";

/**
 * InlineText — editable text cell
 */
export function InlineText({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setV(value);
  }, [value]);

  return (
    <input
      ref={ref}
      className="bg-transparent outline-none w-full text-sm"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onChange(v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setV(value);
      }}
    />
  );
}

/**
 * InlineSelect — dropdown cell (for Section, Status, Priority)
 */
export function InlineSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      className="bg-transparent outline-none text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/**
 * InlineDate — inline date picker cell
 */
export function InlineDate({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      className="bg-transparent outline-none text-sm"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
