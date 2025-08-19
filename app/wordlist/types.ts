export type UserWord = {
  id: number;
  status: 'new' | 'learning' | 'familiar' | 'mastered' | 'forgotten';
  addedAt: string;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  totalReviews: number;
  correctCount: number;
  currentStreak: number;
  easeFactor: number;
  intervalDays: number;
  personalNote: string | null;
  isFavorite: boolean;
  word: string;
  definition: string;
  vnDefinition: string;
  partOfSpeech: string;
  examples: string[];
  cefrLevel: string;
  ukIpa: string;
  usIpa: string;
  ukAudioUrl: string;
  usAudioUrl: string;
};

export type WordsResponse = {
  success: boolean;
  message: string;
  data: {
    words: UserWord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    stats: {
      total: number;
      statusCounts: Record<string, number>;
    };
    filters: {
      status: string | null;
      search: string | null;
      sort: string;
      order: string;
    };
  };
};
