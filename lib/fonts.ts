import { Buda, Inter, Playfair_Display } from 'next/font/google';

/** Single Buda instance: use `.variable` on `<html>` and `.className` where the face must apply (e.g. sidebar project names). */
export const fontAhmedEmad = Buda({
  weight: '300',
  subsets: ['latin'],
  variable: '--font-ahmed-emad',
  display: 'swap',
});

/*
 * Inter and Playfair Display were a render-blocking Google Fonts @import in globals.css.
 * Self-hosted through next/font they are preloaded with the page instead. Both are variable fonts,
 * so every weight the CSS uses (300–700, Playfair italic) is covered.
 */
export const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const fontPlayfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
});
