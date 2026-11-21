import { useId, useRef } from 'react'
import type { DisplaySettings } from './displaySettings'

interface Props {
  settings: DisplaySettings
  onChange(settings: DisplaySettings): void
}

const options = [
  ['obsolete', 'Obsolete assets'],
  ['vulnerabilities', 'Vulnerabilities'],
  ['security', 'Security tab'],
  ['footer', 'Footer']
] as const

export function DisplaySettingsDialog({ settings, onChange }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useId()

  return <>
    <button className="inventory-toggle glass" type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>Settings</button>
    <dialog className="settings-dialog glass" ref={dialog} aria-labelledby={title}>
      <div className="panel-head">
        <h2 id={title}>Display settings</h2>
        <form method="dialog"><button className="icon-button" aria-label="Close settings">×</button></form>
      </div>
      <fieldset>
        <legend>Show in the visualizer</legend>
        {options.map(([key, label]) => <label key={key}>
          <input type="checkbox" checked={settings[key]} onChange={event => onChange({ ...settings, [key]: event.target.checked })} />
          {label}
        </label>)}
      </fieldset>
      <fieldset>
        <legend>Application carousel position</legend>
        {(['bottom', 'right'] as const).map(position => <label key={position}>
          <input type="radio" name="carousel-position" value={position} checked={settings.carouselPosition === position}
            onChange={() => onChange({ ...settings, carouselPosition: position })} />
          {position === 'bottom' ? 'Bottom' : 'Right side'}
        </label>)}
      </fieldset>
    </dialog>
  </>
}
