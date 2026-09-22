export interface Channel {
  name: string;
  url: string;
  status: boolean | null; // true = online, false = offline/error, null = untested
  category?: string;
  country?: string;
  logo?: string;
}

export interface Country {
  name: string;
  code: string; // e.g. "bd", "us"
  flag?: string;
  languages?: string[];
}

export type Category = 'home' | 'news' | 'sports' | 'entertainment' | 'cartoon';
