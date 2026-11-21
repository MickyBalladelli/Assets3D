export interface DisplaySettings {
  obsolete: boolean
  vulnerabilities: boolean
  security: boolean
  footer: boolean
  carouselPosition: 'bottom' | 'right'
}

const defaults: DisplaySettings = { obsolete: true, vulnerabilities: true, security: true, footer: true, carouselPosition: 'bottom' }
const storageKey = 'stratum.display-settings'

export function readDisplaySettings(): DisplaySettings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (saved && typeof saved === 'object') {
      return {
        obsolete: typeof saved.obsolete === 'boolean' ? saved.obsolete : defaults.obsolete,
        vulnerabilities: typeof saved.vulnerabilities === 'boolean' ? saved.vulnerabilities : defaults.vulnerabilities,
        security: typeof saved.security === 'boolean' ? saved.security : defaults.security,
        footer: typeof saved.footer === 'boolean' ? saved.footer : defaults.footer,
        carouselPosition: saved.carouselPosition === 'right' ? 'right' : defaults.carouselPosition
      }
    }
  } catch {
    return defaults
  }
  return defaults
}

export function saveDisplaySettings(settings: DisplaySettings) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings))
  } catch {
    // The current view still honors settings when storage is unavailable.
  }
}
