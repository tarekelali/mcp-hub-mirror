import React from "react";

type Opt = { value: string; label: string };

export function SegmentedControl({ 
  value, 
  options, 
  onChange 
}: { 
  value: string; 
  options: Opt[]; 
  onChange: (v: string) => void;
}) {
  // Wrap SKAPA segmented control web component here; placeholder HTML for now
  return (
    <div 
      role="tablist" 
      style={{ 
        display: "inline-flex", 
        border: "1px solid var(--color-ikea-blue)", 
        borderRadius: 8 
      }}
    >
      {options.map(o => (
        <button 
          key={o.value} 
          aria-pressed={value === o.value} 
          onClick={() => onChange(o.value)} 
          style={{ 
            padding: "6px 12px", 
            background: value === o.value ? "var(--color-ikea-blue)" : "transparent", 
            color: value === o.value ? "var(--color-static-white)" : "var(--color-static-black)", 
            border: "none" 
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}