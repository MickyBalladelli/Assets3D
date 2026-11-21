import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

interface Drag {
  id: number
  startX: number
  startScroll: number
  lastX: number
  lastTime: number
  velocity: number
  moving: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function useCarouselDrag() {
  const strip = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const suppressClick = useRef(false)

  const stopMotion = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    const element = strip.current
    if (element && !drag.current?.moving) delete element.dataset.manualScroll
  }, [])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    stopMotion()
    const element = event.currentTarget
    if (!event.isPrimary || event.pointerType === 'touch' || event.button !== 0 ||
      element.scrollWidth <= element.clientWidth || !(event.target instanceof Element) ||
      !event.target.closest('.app-card')) return

    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startScroll: element.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moving: false
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current
    if (!active || active.id !== event.pointerId) return
    const element = event.currentTarget
    const delta = active.startX - event.clientX
    if (!active.moving) {
      if (Math.abs(delta) < 5) return
      active.moving = true
      element.dataset.manualScroll = 'true'
      element.dataset.dragging = 'true'
      element.setPointerCapture(event.pointerId)
    }

    const elapsed = event.timeStamp - active.lastTime
    if (elapsed > 0) {
      const velocity = clamp((active.lastX - event.clientX) / elapsed, -3, 3)
      const weight = 1 - Math.exp(-elapsed / 30)
      active.velocity += (velocity - active.velocity) * weight
      active.lastX = event.clientX
      active.lastTime = event.timeStamp
    }
    element.scrollLeft = active.startScroll + delta
  }

  function finish(event: PointerEvent<HTMLDivElement>, canceled = false) {
    const active = drag.current
    if (!active || event.pointerId !== active.id) return
    const element = event.currentTarget
    drag.current = null
    if (!active.moving) return
    suppressClick.current = true
    delete element.dataset.dragging

    const start = element.scrollLeft
    const elapsed = Math.max(0, event.timeStamp - active.lastTime)
    const velocity = canceled ? 0 : active.velocity * Math.exp(-elapsed / 65)
    const last = element.scrollWidth - element.clientWidth
    const firstCard = element.firstElementChild
    const secondCard = firstCard?.nextElementSibling
    const firstRect = firstCard?.getBoundingClientRect()
    const secondRect = secondCard?.getBoundingClientRect()
    const pitch = firstRect && secondRect ? secondRect.left - firstRect.left : 0
    const coast = clamp(start + velocity * 180, 0, last)
    const snap = pitch > 0 ? clamp(Math.round(coast / pitch) * pitch, 0, last) : coast
    const end = Math.abs(coast - last) < Math.abs(coast - snap) ? last : snap

    if (matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(end - start) < 1) {
      element.scrollLeft = matchMedia('(prefers-reduced-motion: reduce)').matches ? start : end
      stopMotion()
      return
    }
    const duration = clamp(180 + Math.abs(end - start) * .7, 210, 560)
    const began = performance.now()
    function tick(now: number) {
      const progress = clamp((now - began) / duration, 0, 1)
      element.scrollLeft = start + (end - start) * (1 - (1 - progress) ** 3)
      if (progress < 1) frame.current = requestAnimationFrame(tick)
      else stopMotion()
    }
    frame.current = requestAnimationFrame(tick)
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current?.moving && drag.current?.id === event.pointerId) drag.current = null
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current || event.detail === 0) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    strip, stopMotion, handlers: {
      onPointerDown, onPointerMove, onPointerLeave, onClickCapture,
      onPointerUp: finish,
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finish(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => finish(event, true),
      onWheel: stopMotion
    }
  }
}
