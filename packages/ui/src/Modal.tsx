import React from "react";

export function Modal({ 
  open, 
  onClose, 
  children 
}: { 
  open: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
}) {
  if (!open) return null;
  
  return (
    <div 
      role="dialog" 
      aria-modal 
      style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(0,0,0,0.4)", 
        display: "grid", 
        placeItems: "center",
        zIndex: 50
      }} 
      onClick={onClose}
    >
      <div 
        style={{ 
          background: "var(--color-static-white)", 
          color: "var(--color-static-black)", 
          minWidth: 360, 
          maxWidth: "80vw", 
          maxHeight: "80vh", 
          overflow: "auto", 
          borderRadius: 12, 
          padding: 16 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}