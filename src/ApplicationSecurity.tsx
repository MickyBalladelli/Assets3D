import { formatUpdateDate } from './applicationCriteria'
import type { ApplicationSecurityInfo } from './graph'

export function ApplicationSecurity({ security }: { security?: ApplicationSecurityInfo }) {
  if (!security) return <p>Security contacts unavailable.</p>

  return <section className="application-security" aria-label="Application security">
    <dl>
      <div><dt>Administrators</dt><dd>{security.admins.length
        ? <ul>{security.admins.map(admin => <li key={admin}>{admin}</li>)}</ul>
        : 'Unassigned'}</dd></div>
      <div><dt>Application owner</dt><dd>{security.owner ?? 'Unassigned'}</dd></div>
      <div><dt>Support group</dt><dd>{security.supportGroup ?? 'Unassigned'}</dd></div>
      {security.securityGroup && <div><dt>Security group</dt><dd>{security.securityGroup}</dd></div>}
      {security.lastAccessReview && <div><dt>Last access review</dt><dd>{formatUpdateDate(Date.parse(security.lastAccessReview))}</dd></div>}
    </dl>
  </section>
}
