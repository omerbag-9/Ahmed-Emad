export interface Photo {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  width: number;
  height: number;
  order: number;
}

export interface Place {
  id: string;
  name: string;
  slug: string;
  category: string;
  /** City, branch, or venue — shown in the sidebar next to the project name */
  location?: string;
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
