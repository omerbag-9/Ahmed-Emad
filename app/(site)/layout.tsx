import PortfolioShell from './PortfolioShell';

/* Places and the about text change from the admin; never serve a stale copy */
export const dynamic = 'force-dynamic';

/**
 * Portfolio, project pages, About and Contact share this layout, so the sidebar stays mounted
 * between them: its active marker slides instead of the whole sidebar re-rendering.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <PortfolioShell>{children}</PortfolioShell>;
}
