"use client";

import React from "react";

export default function EloChart({ history }) {
  if (!history || history.length === 0) return null;

  const W = 360;
  const H = 120;
  const PAD = 24;

  const elos = history.map((h) => h.elo);
  const minElo = Math.min(...elos) - 20;
  const maxElo = Math.max(...elos) + 20;

  const sx = (i) => PAD + (i / Math.max(1, elos.length - 1)) * (W - PAD * 2);
  const sy = (e) => H - PAD - ((e - minElo) / Math.max(1, maxElo - minElo)) * (H - PAD * 2);

  const pathD = elos.map((e, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(e)}`).join(" ");
  const areaD = `${pathD} L ${sx(elos.length - 1)} ${H - PAD} L ${PAD} ${H - PAD} Z`;
  const latestElo = elos[elos.length - 1];

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[360px] h-auto overflow-visible select-none"
      >
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => {
          const yVal = PAD + frac * (H - PAD * 2);
          return (
            <line
              key={frac}
              x1={PAD}
              y1={yVal}
              x2={W - PAD}
              y2={yVal}
              stroke="var(--color-rule)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        {/* Shaded Area */}
        <path d={areaD} fill="var(--color-accent)" opacity="0.12" />

        {/* ELO Trend Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {elos.map((e, i) => (
          <g key={i}>
            <circle
              cx={sx(i)}
              cy={sy(e)}
              r={3.5}
              fill="var(--color-accent)"
              stroke="var(--color-paper)"
              strokeWidth="1.5"
            />
          </g>
        ))}

        {/* Current ELO Tag */}
        <text
          x={sx(elos.length - 1)}
          y={sy(latestElo) - 8}
          textAnchor="middle"
          fill="var(--color-accent)"
          fontSize="11"
          fontWeight="bold"
          fontFamily="var(--font-mono)"
        >
          {latestElo} ELO
        </text>
      </svg>
    </div>
  );
}

