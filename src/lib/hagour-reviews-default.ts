export type HagourReviewSeed = {
  name: string;
  rating: number;
  comment: string;
  sortOrder: number;
};

/** Default approved testimonials for HAGOUR homepage. */
export const HAGOUR_DEFAULT_REVIEWS: HagourReviewSeed[] = [
  {
    name: "רועי ש.",
    rating: 5,
    comment: "חגורה חזקה ונוחה מאוד.\nמשתמש בה כל יום בעבודה.",
    sortOrder: 10,
  },
  {
    name: "דוד ל.",
    rating: 5,
    comment: "נרתיק האקדח יושב מושלם.\nשליפה נוחה ומהירה.",
    sortOrder: 20,
  },
  {
    name: "עומר ב.",
    rating: 5,
    comment: "משלוח מהיר ומוצר איכותי.\nממליץ בחום.",
    sortOrder: 30,
  },
];
