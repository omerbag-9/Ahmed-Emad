import PortfolioShell from '../portfolio/PortfolioShell';

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortfolioShell variant="page">{children}</PortfolioShell>;
}
