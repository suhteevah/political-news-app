export const CATEGORIES = [
  "Breaking",
  "Politics",
  "Economy",
  "Culture",
  "Media",
  "World",
  "Opinion",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FEED_PAGE_SIZE = 20;
export const COMMENTS_PAGE_SIZE = 15;
export const FORUM_PAGE_SIZE = 25;
