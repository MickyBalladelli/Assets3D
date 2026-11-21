import type { AttentionSummary, Maintenance } from './attention'
import type { DisplaySettings } from './displaySettings'

interface Props {
  summary: AttentionSummary
  maintenance?: Maintenance
  displaySettings: DisplaySettings
}

export function AssetAttention({ summary, maintenance, displaySettings }: Props) {
  if (!summary.obsolete && !summary.vulnerabilities) return null
  const findings = displaySettings.vulnerabilities ? maintenance?.vulnerabilities?.filter(finding => finding.status !== 'resolved') ?? [] : []
  return <section className="asset-attention" aria-label="Maintenance and security">
    <h3>Needs attention</h3>
    <dl>
      {displaySettings.obsolete && <div><dt>Obsolete assets</dt><dd>{summary.obsolete}</dd></div>}
      {displaySettings.vulnerabilities && <div><dt>Open vulnerabilities</dt><dd>{summary.vulnerabilities}{summary.highestSeverity ? ' · ' + summary.highestSeverity + ' highest' : ''}</dd></div>}
    </dl>
    {displaySettings.obsolete && maintenance?.obsolete && <div className="attention-detail">
      <strong>Obsolete</strong>
      <p>{maintenance.obsolete.reason}</p>
      {maintenance.obsolete.upgradeTo && <p>Recommended update · {maintenance.obsolete.upgradeTo}</p>}
    </div>}
    {findings.map(finding => <div className="attention-detail" key={finding.id}>
      <strong>{finding.severity} · {finding.summary}</strong>
      {finding.remediation && <p>{finding.remediation}</p>}
    </div>)}
  </section>
}
