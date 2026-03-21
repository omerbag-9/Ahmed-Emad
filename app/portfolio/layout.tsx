import PortfolioShell from './PortfolioShell';

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortfolioShell variant="gallery">{children}</PortfolioShell>;
}
