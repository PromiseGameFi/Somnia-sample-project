import React, { useMemo } from 'react'

export type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  stroke?: string
}

export function Sparkline({ values, width = 240, height = 60, stroke = '#4ade80' }: SparklineProps) {
  const path = useMemo(() => {
    if (!values.length) return ''
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const dx = width / Math.max(values.length - 1, 1)
    const norm = (v: number) => (1 - (v - min) / Math.max(max - min, 1)) * (height - 6) + 3

    let d = ''
    values.forEach((v, i) => {
      const x = i * dx
      const y = norm(v)
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`
    })
    return d
  }, [values, width, height])

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={path} stroke={stroke} strokeWidth={2} fill="none" />
      {/* baseline */}
      <line x1={0} y1={height - 3} x2={width} y2={height - 3} stroke="#333" />
    </svg>
  )
}