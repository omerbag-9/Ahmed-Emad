import PortfolioShell from '../portfolio/PortfolioShell';

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortfolioShell variant="page">{children}</PortfolioShell>;
}
