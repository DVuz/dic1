export type WordMeaningInputTranslate = {
  id: number;
  audio: {
    us: string;
    uk: string;
  };
  ipa: {
    us: string;
    uk: string;
  };
  partOfSpeech: string;
  definition: string;
  vnDefinition?: string; // Thêm trường nghĩa tiếng Việt
  cefr_level: string;
  examples: string[];
};

export type TranslationResponse = {
  translatedDefinitions: {
    original: string;
    translated: string;
  }[];
};
