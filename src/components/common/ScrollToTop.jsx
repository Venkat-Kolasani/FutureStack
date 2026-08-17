import { useState, useEffect } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="scroll-to-top-btn"
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "2rem",
        width: "48px",
        height: "48px",
        borderRadius: "50%",
        border: "none",
        background: "var(--primary, #6366f1)",
        color: "#fff",
        fontSize: "1.25rem",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.3s, transform 0.3s",
        pointerEvents: visible ? "auto" : "none",
        zIndex: 9999,
      }}
    >
      ↑
    </button>
  );
}
