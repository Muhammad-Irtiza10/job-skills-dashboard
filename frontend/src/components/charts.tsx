// Small chart pieces drawn in the metro-line style: bar list, best-match gauge, empty-state note.
import React from "react"

export interface BarRow {
  label: string
  pct: number // 0–100, sets the bar length
  value: string // text shown at the end of the row
  tip: string // full sentence for hover and screen readers
}

export function BarList({ rows, color, thin }: { rows: BarRow[]; color: string; thin?: boolean }) {
  return (
    <ul className={`bars ${thin ? "bars--thin" : ""}`} style={{ "--c": color } as React.CSSProperties}>
      {rows.map(r => (
        <li key={r.label} tabIndex={0} title={r.tip} aria-label={r.tip}>
          <span className="b-label">{r.label}</span>
          <span className="b-track" style={{ "--w": `${Math.max(0, Math.min(100, r.pct))}%` } as React.CSSProperties}>
            <span className="b-fill" />
            <span className="b-dot" />
          </span>
          <span className="b-val">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

// Semicircle gauge whose red compass needle swings to the value.
export function MatchDial({ value }: { value: number }) {
  const p = Math.max(0, Math.min(100, value))
  return (
    <div className="dial w-[120px] shrink-0 sm:w-[150px]">
      <svg viewBox="0 0 150 100" role="img" aria-label={`Best match ${value}%`} className="block h-auto w-full">
        <path className="arc" d="M15 75 A60 60 0 0 1 135 75" pathLength={100} />
        <path className="arcv" d="M15 75 A60 60 0 0 1 135 75" pathLength={100} strokeDasharray={`${p} 100`} />
        <polygon className="nd" points="75,22 79.5,75 70.5,75" style={{ "--r": `${-90 + p * 1.8}deg` } as React.CSSProperties} />
        <circle className="hb" cx="75" cy="75" r="7" />
        <text x="15" y="95" textAnchor="middle">0</text>
        <text x="135" y="95" textAnchor="middle">100</text>
        <text className="cap" x="75" y="95" textAnchor="middle">Best match</text>
      </svg>
    </div>
  )
}

export function EmptyNote({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-sm border border-dashed p-4 text-sm text-ink-2 [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-3">
      {icon}
      <span>{children}</span>
    </div>
  )
}
