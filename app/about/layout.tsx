import PortfolioShell from '../portfolio/PortfolioShell';

export const dynamic = 'force-dynamic';

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortfolioShell variant="page">{children}</PortfolioShell>;
}
