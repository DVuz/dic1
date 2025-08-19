'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {toast} from 'sonner';
import {
  AlertCircle,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Volume2,
  Languages,
  CheckCircle,
  ScanSearch,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import WordTable from './components/WordTable';
declare module 'next-auth' {
  interface Session {
    user: {
      id: string; // hoặc number nếu bạn dùng Int
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// Types
interface WordMeaning {
  id?: number;
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
  vnDefinition?: string;
  cefr_level: string;
  examples: string[];
  translationSource?: string;
}

interface CambridgeWord {
  word: string;
  meanings: WordMeaning[];
  translation: string;
  wordId?: number;
  source: 'database' | 'crawl';
}

interface AddToUserWordsInput {
  wordId: number;
  meaningId: number;
  userId: number;
  personalNote?: string;
  isFavorite?: boolean;
}

interface TranslateRequest {
  definitions: string[];
  meaningIds: number[];
}

// API functions
const fetchWord = async (word: string): Promise<CambridgeWord> => {
  if (!word.trim()) {
    throw new Error('Word is required');
  }

  const response = await fetch(`/api/crawl?word=${encodeURIComponent(word.trim())}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error: ${response.status}`);
  }

  return response.json();
};

const translateDefinitions = async (data: TranslateRequest) => {
  const response = await fetch('/api/quickTranslate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Translation failed');
  }

  return response.json();
};

const addWordToVocabulary = async (data: AddToUserWordsInput) => {
  const response = await fetch('/api/addToUserWords', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to add word to vocabulary');
  }

  return response.json();
};

// Audio play function
const playAudio = (audioUrl: string) => {
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  }
};

// Word Result Component
const WordResult = ({ data }: { data: CambridgeWord }) => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [currentMeanings, setCurrentMeanings] = useState<WordMeaning[]>(data.meanings);

  // Thêm state để track từng nghĩa đang loading
  const [loadingMeanings, setLoadingMeanings] = useState<Set<number>>(new Set());

  // Cập nhật meanings khi data thay đổi
  useEffect(() => {
    setCurrentMeanings(data.meanings);
  }, [data.meanings]);

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: translateDefinitions,
    onSuccess: result => {
      // Cập nhật meanings với bản dịch mới
      const updatedMeanings = currentMeanings.map(meaning => {
        if (!meaning.vnDefinition && meaning.id) {
          const untranslatedMeanings = currentMeanings.filter(m => !m.vnDefinition && m.id);
          const untranslatedIndex = untranslatedMeanings.findIndex(um => um.id === meaning.id);

          if (untranslatedIndex >= 0) {
            return {
              ...meaning,
              vnDefinition:
                result.translatedDefinitions[untranslatedIndex]?.translated || meaning.definition,
              translationSource: 'api',
            };
          }
        }
        return meaning;
      });
      setCurrentMeanings(updatedMeanings);
    },
    onError: error => {
      console.error('Translation failed:', error);
      toast.error('Dịch nghĩa thất bại. Vui lòng thử lại.');
    },
  });

  // Add to vocabulary mutation
  const addToVocabularyMutation = useMutation({
    mutationFn: addWordToVocabulary,
    onMutate: variables => {
      // Thêm meaningId vào loading set
      setLoadingMeanings(prev => new Set(prev.add(variables.meaningId)));
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success('Đã thêm từ vào danh sách học thành công!');
        queryClient.invalidateQueries({ queryKey: ['userWords'] });
      }
      // Xóa meaningId khỏi loading set
      setLoadingMeanings(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.meaningId);
        return newSet;
      });
    },
    onError: (error: any, variables) => {
      if (error.message.includes('already added')) {
        toast.error('Từ này đã có trong danh sách học của bạn');
      } else {
        toast.error(error.message || 'Có lỗi xảy ra khi thêm từ');
      }
      // Xóa meaningId khỏi loading set
      setLoadingMeanings(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.meaningId);
        return newSet;
      });
    },
  });

  // Kiểm tra từ currentMeanings (đã bao gồm cả data gốc và sau khi dịch)
  const meaningsWithTranslation = currentMeanings.filter(m => m.vnDefinition);
  const meaningsWithoutTranslation = currentMeanings.filter(m => !m.vnDefinition && m.id);

  const hasVietnameseMeanings = meaningsWithTranslation.length > 0;
  const hasUntranslatedMeanings = meaningsWithoutTranslation.length > 0;

  // Tự động hiển thị tiếng Việt nếu đã có sẵn vnDefinition
  const [showVietnamese, setShowVietnamese] = useState(hasVietnameseMeanings);

  // Cập nhật showVietnamese khi có bản dịch mới
  useEffect(() => {
    if (meaningsWithTranslation.length > 0) {
      setShowVietnamese(true);
    }
  }, [meaningsWithTranslation.length]);

  const handleTranslate = () => {
    if (translateMutation.isPending || !hasUntranslatedMeanings) return;

    const definitions = meaningsWithoutTranslation.map(m => m.definition);
    const meaningIds = meaningsWithoutTranslation.map(m => m.id!);

    translateMutation.mutate({ definitions, meaningIds });
  };

  const handleAddToVocabulary = (meaning: WordMeaning) => {
    if (!session?.user?.id) {
      toast.error('Vui lòng đăng nhập để thêm từ vào danh sách học');
      return;
    }

    if (!data.wordId || !meaning.id) {
      toast.error('Thông tin từ vựng không đầy đủ');
      return;
    }

    addToVocabularyMutation.mutate({
      wordId: data.wordId,
      meaningId: meaning.id,
      userId: parseInt(session.user.id),
    });
  };

  return (
    <div className="space-y-2">
      {/* Compact Status & Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200 rounded-md p-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 font-medium">
              Tổng: <span className="font-bold text-blue-600">{currentMeanings.length}</span> nghĩa
            </span>
            {hasVietnameseMeanings && (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Đã dịch: <span className="font-bold">{meaningsWithTranslation.length}</span>
              </span>
            )}
            {hasUntranslatedMeanings && (
              <span className="text-orange-600">
                Chưa dịch: <span className="font-bold">{meaningsWithoutTranslation.length}</span>
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            {hasUntranslatedMeanings && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTranslate}
                disabled={translateMutation.isPending}
                className="h-7 px-2 text-sm"
              >
                {translateMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    Đang dịch...
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5 mr-1" />
                    Dịch ({meaningsWithoutTranslation.length})
                  </>
                )}
              </Button>
            )}

            {hasVietnameseMeanings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVietnamese(!showVietnamese)}
                className="h-7 px-2 text-sm"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {showVietnamese ? 'Hiện EN' : 'Hiện VI'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Meanings List */}
      <div className="space-y-1.5">
        {currentMeanings.map((meaning, index) => {
          // Kiểm tra từng nghĩa có đang loading không
          const isMeaningLoading = meaning.id ? loadingMeanings.has(meaning.id) : false;

          return (
            <Card
              key={meaning.id || index}
              className="border-l-3 border-l-blue-500 shadow-sm hover:shadow transition-shadow"
            >
              <CardContent className="p-2.5">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {meaning.partOfSpeech && (
                      <Badge variant="outline" className="text-sm px-1.5 py-0.5 h-5">
                        {meaning.partOfSpeech}
                      </Badge>
                    )}
                    {meaning.cefr_level && (
                      <Badge variant="secondary" className="text-sm px-1.5 py-0.5 h-5">
                        {meaning.cefr_level}
                      </Badge>
                    )}
                    {meaning.vnDefinition ? (
                      <Badge className="text-sm px-1.5 py-0.5 h-5 bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-0.5" />
                        Đã dịch {meaning.translationSource === 'api' ? '(API)' : '(DB)'}
                      </Badge>
                    ) : meaning.id ? (
                      <Badge
                        variant="outline"
                        className="text-sm px-1.5 py-0.5 h-5 bg-orange-50 text-orange-700 border-orange-200"
                      >
                        Chưa dịch
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-sm px-1.5 py-0.5 h-5 bg-gray-50 text-gray-600"
                      >
                        N/A
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    {/* IPA */}
                    <div className="text-sm text-gray-600 hidden sm:flex items-center gap-1.5">
                      {meaning.ipa.uk && (
                        <span className="bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-sm font-mono">
                          UK: /{meaning.ipa.uk}/
                        </span>
                      )}
                      {meaning.ipa.us && (
                        <span className="bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-sm font-mono">
                          US: /{meaning.ipa.us}/
                        </span>
                      )}
                    </div>

                    {/* Audio Buttons */}
                    <div className="flex gap-0.5">
                      {meaning.audio.uk && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playAudio(meaning.audio.uk)}
                          className="h-7 w-7 p-0 border-blue-300 hover:bg-blue-50"
                          title="Phát âm UK"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                      )}
                      {meaning.audio.us && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => playAudio(meaning.audio.us)}
                          className="h-7 w-7 p-0 border-red-300 hover:bg-red-50"
                          title="Phát âm US"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Definition */}
                <div className="mb-2">
                  <p className="text-gray-900 text-base leading-relaxed font-medium">
                    {showVietnamese && meaning.vnDefinition
                      ? meaning.definition
                      : meaning.vnDefinition || meaning.definition}
                  </p>
                  {showVietnamese && meaning.vnDefinition && (
                    <div className="mt-1.5 p-2 bg-gray-50 border-l-4 border-gray-300 rounded-r">
                      <p className="text-gray-700 text-sm italic">
                        <span className="font-medium text-gray-800">Nghĩa tiếng Việt:</span>{' '}
                        {meaning.vnDefinition}
                      </p>
                    </div>
                  )}
                </div>

                {/* Examples */}
                {meaning.examples && meaning.examples.length > 0 && (
                  <div className="mb-2">
                    <Separator className="my-1.5" />
                    <div className="text-sm text-gray-700 mb-1.5 font-medium flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Ví dụ:
                    </div>
                    <ul className="space-y-1.5">
                      {meaning.examples.slice(0, 3).map((example, exIndex) => (
                        <li
                          key={exIndex}
                          className="text-sm text-gray-700 pl-2.5 border-l-3 border-blue-300 bg-blue-50/50 py-1.5 rounded-r"
                        >
                          "{example}"
                        </li>
                      ))}
                      {meaning.examples.length > 3 && (
                        <li className="text-sm text-gray-500 italic pl-2.5 pt-0.5">
                          +{meaning.examples.length - 3} ví dụ khác...
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Add Button */}
                {meaning.id && (
                  <div className="pt-1">
                    <Separator className="mb-2" />
                    <Button
                      size="sm"
                      className="h-7 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-sm"
                      onClick={() => handleAddToVocabulary(meaning)}
                      disabled={isMeaningLoading}
                    >
                      {isMeaningLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Đang thêm vào danh sách...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 mr-1.5" />
                          Thêm vào danh sách học
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Main Page Component
const LookupPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // React Query for word lookup
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['word', searchTerm],
    queryFn: () => fetchWord(searchTerm),
    enabled: false,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setHasSearched(true);
      setShowTable(false);
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const showResults = hasSearched && (data || error);

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden max-w-screen-2xl mx-auto">
      <div className="h-full flex">
        {/* Left Column - Search Section - Compact */}
        <div className="w-80 flex-shrink-0 p-6 bg-white/80 backdrop-blur-sm border-r border-gray-200 overflow-auto">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
                <Search className="w-5 h-5 text-blue-600" />
                Tra cứu từ vựng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="vocab-input" className="text-sm font-medium text-gray-700">
                  Nhập từ vựng cần tra cứu
                </Label>
                <Input
                  id="vocab-input"
                  placeholder="Ví dụ: example, beautiful, amazing..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="h-11 border-2 border-gray-200 focus:border-blue-500 transition-colors text-base"
                  disabled={isLoading || isFetching}
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={!searchTerm.trim() || isLoading || isFetching}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
              >
                {isLoading || isFetching ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Đang tìm kiếm...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Tìm kiếm
                  </>
                )}
              </Button>

              {/* Toggle Button */}
              <Button
                variant="outline"
                onClick={() => setShowTable(!showTable)}
                className="w-full h-11 border-2 border-gray-200 hover:border-blue-500 transition-colors"
              >
                {showTable ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Ẩn danh sách từ
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Hiển thị danh sách từ
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Search Tips */}
          <Card className="mt-4 shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Hướng dẫn sử dụng
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ul className="text-xs text-gray-700 space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  Nhập từ tiếng Anh để tra nghĩa
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  Hệ thống tự động hiển thị bản dịch từ database
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  Click "Dịch" nếu cần dịch nghĩa chưa có
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  Bấm vào biểu tượng loa để nghe phát âm
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                  Nhấn "Thêm" để lưu từ vào danh sách từ vựng của bạn
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results/Table Section - Scrollable */}
        <div className="flex-1 p-6">
          <Card className="h-full shadow-lg border-0 bg-white/90 backdrop-blur-sm flex flex-col">
            <CardHeader className="flex-shrink-0 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
                <BookOpen className="w-5 h-5 text-purple-600" />
                {showResults ? (
                  <>
                    <span>Kết quả: "{searchTerm}"</span>
                    {data && (
                      <Badge variant="secondary" className="ml-auto">
                        {data.meanings.length} nghĩa
                      </Badge>
                    )}
                  </>
                ) : (
                  <span>Danh sách từ vựng</span>
                )}
              </CardTitle>
              {data?.source && showResults && (
                <p className="text-sm text-gray-600">
                  Nguồn: {data.source === 'database' ? 'Cơ sở dữ liệu' : 'Cambridge Dictionary'}
                </p>
              )}
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-6">
              <div className="h-full overflow-y-auto pr-2 -mr-2">
                {showResults ? (
                  /* Search Results */
                  <>
                    {isLoading || isFetching ? (
                      /* Loading State */
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                          <p className="text-gray-600">Đang tìm kiếm từ vựng...</p>
                          <p className="text-sm text-gray-500">
                            Hệ thống đang tra cứu từ điển Cambridge...
                          </p>
                        </div>
                      </div>
                    ) : error ? (
                      /* Error State */
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4">
                          <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
                          <div>
                            <p className="text-red-600 font-medium">Không tìm thấy từ vựng</p>
                            <p className="text-gray-600 text-sm mt-2">
                              {error instanceof Error ? error.message : 'Đã có lỗi xảy ra'}
                            </p>
                          </div>
                          <Button variant="outline" onClick={() => refetch()}>
                            Thử lại
                          </Button>
                        </div>
                      </div>
                    ) : data ? (
                      /* Success State */
                      <WordResult data={data} />
                    ) : null}
                  </>
                ) : (
                  /* Word Table */
                  <div className="h-full">
                    <WordTable />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LookupPage;
