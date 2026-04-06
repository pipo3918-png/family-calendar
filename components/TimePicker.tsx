"use client";

const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

type Props = {
  value: string; // "HH:MM" or ""
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function TimePicker({ value, onChange, disabled, placeholder = "--:--" }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none transition-colors appearance-none ${
        disabled
          ? "bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed"
          : "border-sky-100 focus:border-sky-400 text-gray-800 bg-white cursor-pointer"
      }`}
    >
      <option value="">{placeholder}</option>
      {TIMES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );
}
