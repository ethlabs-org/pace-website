// The ask the whole site leads to: join the working group that takes PACE to Hegotá. Every CTA row uses
// this one button, so the destination changes here and nowhere else. Until there is a sign-up of its own, it goes
// to "Get involved" on the deliverables page.
export const JOIN_HREF = '/docs/deliverables#get-involved'

export function Join({ ghost = false }: { ghost?: boolean }) {
  return <a className={ghost ? 'btn ghost' : 'btn'} href={JOIN_HREF}>Join the Working Group</a>
}
