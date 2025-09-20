import React from "react";

export default function RiskGauge({ score = 0, label = "Risk Score" }) {
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const color =
    clamped >= 90 ? "#dc2626" : clamped >= 70 ? "#f97316" : clamped >= 40 ? "#f59e0b" : "#16a34a";

  return (
    <div className="relative w-36 h-36">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${clamped * 3.6}deg, #e5e7eb ${clamped * 3.6}deg)`
        }}
      />
      <div className="absolute inset-2 rounded-full bg-white shadow-inner" />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-2xl font-bold" style={{ color }}>{clamped}%</span>
      </div>
    </div>
  );
}