export interface AddToUserWordsInput {
  wordId: number;
  meaningId: number;
  personalNote?: string;
  isFavorite?: boolean;
}

export interface AddToUserWordsResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    wordId: number;
    meaningId: number;
    userId: number;
    status: string;
    addedAt: string;
    personalNote?: string;
    isFavorite: boolean;
  };
  error?: string;
}
