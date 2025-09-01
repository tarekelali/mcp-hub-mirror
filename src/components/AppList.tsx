import React from "react";

export function AppList({ 
  countries, 
  onOpen 
}: {
  countries: Array<{ code: string; name: string; total: number; published: number; unpublished: number }>;
  onOpen: (code: string) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {countries.map(c => (
        <div 
          key={c.code} 
          style={{ 
            border: "1px solid #eee", 
            borderRadius: 12, 
            padding: 12 
          }}
        >
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {c.name} ({c.code})
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Total {c.total} • Published {c.published} • Unpublished {c.unpublished}
              </div>
            </div>
            <button
              onClick={() => onOpen(c.code)}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                border: "1px solid var(--color-ikea-blue)",
                background: "var(--color-ikea-blue)", 
                color: "var(--color-static-white)",
                cursor: "pointer"
              }}
            >
              View Projects
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}