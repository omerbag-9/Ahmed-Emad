import { Buda, Inter } from 'next/font/google';

/** Single Buda instance: the AHMED EMAD wordmark. */
export const fontAhmedEmad = Buda({
  weight: '300',
  subsets: ['latin'],
  variable: '--font-ahmed-emad',
  display: 'swap',
});

/*
 * Inter for everything else. Self-hosted through next/font so it is preloaded with the page.
 * Playfair Display was dropped: page titles are set in Inter now, so the site uses two faces.
 */
export const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
