import React, { useEffect, useMemo, useRef, useState } from 'react'

export type ArenaEvent = {
  id: string
  color: string
  label?: string
}

export type GameArenaProps = {
  incoming: ArenaEvent[]
  onCollect?: (ev: ArenaEvent) => void
}

// Simple physics-based arena: events spawn as bubbles, drift around, and can be clicked
export function GameArena({ incoming, onCollect }: GameArenaProps) {
  type Entity = {
    id: string
    x: number
    y: number
    vx: number
    vy: number
    r: number
    color: string
    label?: string
    born: number
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])

  // Spawn incoming events as entities
  useEffect(() => {
    if (!incoming.length) return
    const now = Date.now()
    const rect = containerRef.current?.getBoundingClientRect()
    const width = rect?.width ?? 600
    const height = rect?.height ?? 300

    const additions: Entity[] = incoming.map((ev) => ({
      id: ev.id,
      x: Math.random() * (width - 40) + 20,
      y: Math.random() * (height - 40) + 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 18 + Math.random() * 12,
      color: ev.color,
      label: ev.label,
      born: now,
    }))
    setEntities((prev) => {
      // Prevent duplicates (same id)
      const existing = new Set(prev.map((p) => p.id))
      const merged = [...prev]
      for (const a of additions) {
        if (!existing.has(a.id)) merged.push(a)
      }
      return merged.slice(-200)
    })
  }, [incoming])

  // Basic physics loop
  useEffect(() => {
    let raf: number | null = null
    const step = () => {
      setEntities((prev) => {
        const rect = containerRef.current?.getBoundingClientRect()
        const width = rect?.width ?? 600
        const height = rect?.height ?? 300
        const now = Date.now()
        const lifespan = 15000 // ms

        return prev
          .map((e) => {
            let { x, y, vx, vy, r } = e
            // Wander
            vx += (Math.random() - 0.5) * 0.02
            vy += (Math.random() - 0.5) * 0.02
            // Dampening
            vx *= 0.995
            vy *= 0.995
            x += vx * 1.5
            y += vy * 1.5
            // Walls
            if (x < r) {
              x = r
              vx = Math.abs(vx)
            }
            if (x > width - r) {
              x = width - r
              vx = -Math.abs(vx)
            }
            if (y < r) {
              y = r
              vy = Math.abs(vy)
            }
            if (y > height - r) {
              y = height - r
              vy = -Math.abs(vy)
            }
            return { ...e, x, y, vx, vy, r }
          })
          // Expire old entities
          .filter((e) => now - e.born < lifespan)
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const handleClick = (id: string) => {
    setEntities((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx >= 0) {
        const ev = prev[idx]
        onCollect?.({ id: ev.id, color: ev.color, label: ev.label })
        const copy = [...prev]
        copy.splice(idx, 1)
        return copy
      }
      return prev
    })
  }

  const items = useMemo(() => entities, [entities])

  return (
    <div
      ref={containerRef}
      style={{
        height: 320,
        border: '1px solid #333',
        borderRadius: 10,
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #111 0%, #0a0a0a 100%)',
      }}
    >
      {items.map((e) => (
        <div
          key={e.id}
          onClick={() => handleClick(e.id)}
          title={e.label ?? ''}
          style={{
            position: 'absolute',
            left: e.x - e.r,
            top: e.y - e.r,
            width: e.r * 2,
            height: e.r * 2,
            borderRadius: '50%',
            background: e.color,
            boxShadow: '0 0 12px rgba(255,255,255,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          ⚡
        </div>
      ))}
      <div style={{ position: 'absolute', right: 8, top: 8, opacity: 0.7, fontSize: 12 }}>
        Click bubbles to collect events
      </div>
    </div>
  )
}