export interface PublicRelease {
  id: string;
  version: string;
  gameVersion: string;
  interfaceVersion: number;
  changelog: string;
  publishedAt: string;
}

export interface PublicImage { id: string; altText: string; }

export interface PublicAddon {
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  categoryOrder: number;
  summary: string;
  description: string;
  installationInstructions: string;
  author: string;
  license: string;
  credits: string;
  releases: PublicRelease[];
  images: PublicImage[];
}
