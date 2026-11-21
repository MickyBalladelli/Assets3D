interface LabelAnchor {
  label: HTMLButtonElement
  x: number
  y: number
}

interface LabelBounds {
  left: number
  right: number
  top: number
  bottom: number
}

export function positionOverviewLabels(
  anchors: LabelAnchor[],
  width: number,
  height: number,
  sizes: WeakMap<HTMLButtonElement, { width: number, height: number }>
) {
  const gap = 5
  const placed: LabelBounds[] = []
  anchors.sort((a, b) => a.y - b.y || a.x - b.x)
  for (const { label, x, y } of anchors) {
    let size = sizes.get(label)
    if (!size) {
      size = { width: label.offsetWidth, height: label.offsetHeight }
      sizes.set(label, size)
    }
    const left = Math.max(gap, Math.min(Math.round(x - size.width / 2), width - size.width - gap))
    const lastTop = Math.max(gap, height - size.height - gap)
    const ideal = Math.max(gap, Math.min(Math.round(y), lastTop))
    const column = placed.filter(other => left < other.right + gap && left + size.width > other.left - gap)
    const candidates = column.flatMap(other => [other.top - size.height - gap, other.bottom + gap])
    candidates.push(ideal)
    candidates.sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))
    const top = candidates.find(candidate => candidate >= gap && candidate <= lastTop &&
      column.every(other => candidate >= other.bottom + gap || candidate + size.height + gap <= other.top)
    ) ?? ideal
    placed.push({ left, right: left + size.width, top, bottom: top + size.height })
    label.style.transform = `translate(${left}px, ${top}px)`
  }
}
