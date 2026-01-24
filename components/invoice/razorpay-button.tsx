"use client";

import { useEffect, useRef } from "react";

export function RazorpayButton({ buttonId, className }: { buttonId: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content to handle buttonId changes and avoid duplication
    containerRef.current.innerHTML = "";

    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    // Use setAttribute to ensure the attribute name is exactly data-payment_button_id (with underscores)
    script.setAttribute("data-payment_button_id", buttonId);
    script.async = true;
    
    form.appendChild(script);
    containerRef.current.appendChild(form);
  }, [buttonId]);

  return <div ref={containerRef} className={className || "my-6 flex justify-center"} />;
}
