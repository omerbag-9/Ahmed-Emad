import { Buda } from 'next/font/google';

/** Single Buda instance: use `.variable` on `<html>` and `.className` where the face must apply (e.g. sidebar project names). */
export const fontAhmedEmad = Buda({
  weight: '300',
  subsets: ['latin'],
  variable: '--font-ahmed-emad',
  display: 'swap',
});
