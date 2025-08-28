import React from "react";

export function Tabs({ 
  tabs, 
  value, 
  onChange 
}: { 
  tabs: { id: string; label: string }[]; 
  value: string; 
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #eee" }}>
        {tabs.map(t => (
          <button 
            key={t.id} 
            aria-selected={value === t.id} 
            onClick={() => onChange(t.id)} 
            style={{ 
              padding: "8px 12px", 
              border: "none", 
              background: "transparent", 
              borderBottom: value === t.id ? "3px solid var(--color-ikea-blue)" : "3px solid transparent" 
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* consumers render panels by matching value */}
    </div>
  );
}