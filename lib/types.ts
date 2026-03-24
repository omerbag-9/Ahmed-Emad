export interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
  order: number;
  /** When set, used to delete Cloudinary asset(s). `thumb` only on legacy rows (second upload). */
  cloudinary?: { main: string; thumb?: string };
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  /** City, branch, or venue — shown in the sidebar next to the project name */
  location?: string;
  /** Short editorial line — shown above the gallery (grid & slider) */
  brief: string;
  description: string;
  coverImage: string;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

export interface DataStore {
  places: Place[];
  categories: string[];
}
