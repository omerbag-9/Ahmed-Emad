import { revalidatePath } from 'next/cache';

/** Places / project data — sidebar + project routes */
export function revalidateAfterPlacesChange(): void {
  revalidatePath('/portfolio', 'layout');
  revalidatePath('/about', 'layout');
  revalidatePath('/contact', 'layout');
}

/** Main /portfolio grid (GET /api/portfolio) */
export function revalidateAfterPortfolioGalleryChange(): void {
  revalidatePath('/portfolio', 'page');
}
