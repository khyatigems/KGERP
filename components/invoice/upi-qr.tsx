"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface UPIQrProps {
  upiId: string;
  payeeName: string;
  amount?: number;
  note?: string;
  size?: number;
}

export function UPIQr({ upiId, payeeName, amount, note, size = 150 }: UPIQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!upiId || !canvasRef.current) return;

    // Build UPI URL
    // upi://pay?pa=address&pn=name&am=amount&tn=note&cu=INR
    let url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}`;
    
    if (amount) {
      url += `&am=${amount.toFixed(2)}&cu=INR`;
    }
    
    if (note) {
      url += `&tn=${encodeURIComponent(note)}`;
    }

    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }, (error) => {
      if (error) console.error("QR Gen Error", error);
    });
  }, [upiId, payeeName, amount, note, size]);

  return <canvas ref={canvasRef} className="border rounded-md shadow-sm" />;
}
