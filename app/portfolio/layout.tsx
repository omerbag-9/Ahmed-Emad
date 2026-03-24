import type { Metadata } from 'next';
import PortfolioShell from './PortfolioShell';

export const metadata: Metadata = {
  title: 'Portfolio',
  description:
    'Browse the full architectural photography portfolio by Ahmed Emad — cultural spaces, residences, hospitality, restaurants, and workspaces.',
  openGraph: {
    title: 'Portfolio | Ahmed Emad Photographs',
    description: 'Architectural photography portfolio showcasing stunning spaces and design projects.',
  },
};
export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortfolioShell variant="gallery">{children}</PortfolioShell>;
}
