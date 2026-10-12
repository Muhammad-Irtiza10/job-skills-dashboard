// Background metro map, mounted once in the app shell.
// Login ("/") gets the full tilted map with a compass rose; every other page gets a faint, edges-only version.
import { useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"

const ROSE = { cx: 1290, cy: 790, r: 88 }

function CompassRose() {
  const { cx, cy, r } = ROSE
  const pt = (deg: number, len: number) => {
    const a = (deg * Math.PI) / 180
    return [cx + len * Math.sin(a), cy - len * Math.cos(a)]
  }
  const ticks = Array.from({ length: 24 }, (_, i) => i * 15)
  return (
    <g className="rose">
      <circle className="rose-ring" cx={cx} cy={cy} r={r} />
      {ticks.map(d => {
        const [x1, y1] = pt(d, r - 3)
        const [x2, y2] = pt(d, r - (d % 90 === 0 ? 16 : 9))
        return <line key={d} className="rose-tick" x1={x1} y1={y1} x2={x2} y2={y2} />
      })}
      {[0, 90, 180, 270].map(d => {
        const [tx, ty] = pt(d, 62)
        const [lx, ly] = pt(d - 90, 12)
        const [rx, ry] = pt(d + 90, 12)
        return (
          <g key={d}>
            <polygon className="rose-a" points={`${tx},${ty} ${lx},${ly} ${cx},${cy}`} />
            <polygon className="rose-b" points={`${tx},${ty} ${rx},${ry} ${cx},${cy}`} />
          </g>
        )
      })}
      <text className="rose-n" x={cx} y={cy - r - 14} textAnchor="middle">N</text>
      <g className="needle">
        <polygon className="needle-n" points={`${cx},${cy - 78} ${cx + 9},${cy} ${cx - 9},${cy}`} />
        <polygon className="needle-s" points={`${cx},${cy + 78} ${cx + 9},${cy} ${cx - 9},${cy}`} />
        <circle className="hub" cx={cx} cy={cy} r={9} />
      </g>
    </g>
  )
}

export default function MetroMap() {
  const hero = useLocation().pathname === "/"
  const ref = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => (reduce.matches || !hero ? svg.current?.pauseAnimations() : svg.current?.unpauseAnimations())
    sync()
    reduce.addEventListener("change", sync)
    // gentle tilt that follows the pointer on the login page
    const move = (e: PointerEvent) => {
      if (!hero || reduce.matches || !ref.current) return
      ref.current.style.setProperty("--tx", `${(e.clientX / window.innerWidth - 0.5) * 4}deg`)
      ref.current.style.setProperty("--ty", `${(e.clientY / window.innerHeight - 0.5) * -3}deg`)
    }
    window.addEventListener("pointermove", move, { passive: true })
    return () => {
      reduce.removeEventListener("change", sync)
      window.removeEventListener("pointermove", move)
    }
  }, [hero])

  return (
    <div ref={ref} className={`metro ${hero ? "metro--hero" : "metro--calm"}`} aria-hidden="true">
      <svg ref={svg} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        <path className="line" stroke="hsl(var(--line-blue))" pathLength={1} d="M1640 820 H1300 L1160 680 V360 L1020 220 H-40" />
        <path className="line" stroke="hsl(var(--line-amber))" pathLength={1} d="M-40 820 H620 L780 660 H1180 L1330 510 V-40" />
        <path className="line" stroke="hsl(var(--line-teal))" pathLength={1} d="M300 -40 V240 L560 500 V1040" />
        <path id="line-red" className="line" stroke="hsl(var(--line-red))" pathLength={1} d="M-40 640 H360 L500 500 H880 L1020 360 H1640" />
        {[[360, 640], [880, 500], [1020, 360], [300, 240], [560, 800], [620, 820], [1180, 660], [1330, 510], [700, 220], [1160, 600]].map(([x, y]) => (
          <circle key={`${x}-${y}`} className="st" cx={x} cy={y} r={11} />
        ))}
        <rect className="st" x={540} y={480} width={40} height={40} rx={20} />
        <rect className="st" x={1140} y={340} width={40} height={40} rx={20} />
        <circle className="st" cx={1460} cy={360} r={16} />
        <text className="lbl" x={360} y={680} textAnchor="middle">Python</text>
        <text className="lbl" x={560} y={462} textAnchor="middle">SQL</text>
        <text className="lbl" x={1000} y={400} textAnchor="end">Algorithms</text>
        <text className="lbl" x={322} y={232}>Statistics</text>
        <text className="lbl" x={582} y={806}>Machine Learning</text>
        <text className="lbl" x={620} y={860} textAnchor="middle">Communication</text>
        <text className="lbl" x={700} y={200} textAnchor="middle">Cloud (AWS)</text>
        <text className="lbl" x={1186} y={606}>Docker</text>
        <circle className="train" r={9}>
          <animateMotion dur="11s" repeatCount="indefinite" rotate="auto">
            <mpath href="#line-red" />
          </animateMotion>
        </circle>
        <CompassRose />
      </svg>
    </div>
  )
}
