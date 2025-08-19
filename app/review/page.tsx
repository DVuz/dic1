'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Volume2,
  Sparkles,
  AlertCircle,
  Clock,
  BookOpen,
  Trophy,
  Target,
  ChevronLeft,
  Info,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { shuffleArray } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from 'sonner';

// Types
interface ReviewWord {
  id: number | string;
  word: string;
  definition: string;
  vnDefinition: string;
  partOfSpeech?: string;
  status: string;
  priority: string;
  ukIpa?: string;
  usIpa?: string;
  ukAudioUrl?: string;
  usAudioUrl?: string;
  category: string;
  daysOverdue?: number;
  totalReviews: number;
  correctCount: number;
  currentStreak: number;
}

interface ReviewStats {
  totalReturned: number;
  totalDue: number;
  totalNew: number;
  overdue: number;
  forgotten: number;
  learning: number;
  familiar: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

// Fetch review words function
const fetchReviewWords = async () => {
  const response = await fetch('/api/review?limit=20&includeNew=true');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch review words');
  }
  return data.data;
};

// Submit review result function
const submitReviewResult = async ({
  wordId,
  isCorrect,
}: {
  wordId: number | string;
  isCorrect: boolean;
}) => {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'updateReview',
      wordId,
      isCorrect,
      responseTimeMs: 0, // Not tracking time in this implementation
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit review result');
  }

  return response.json();
};

// Status Icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'new':
      return <Target className="h-4 w-4" />;
    case 'learning':
      return <BookOpen className="h-4 w-4" />;
    case 'familiar':
      return <Trophy className="h-4 w-4" />;
    case 'forgotten':
      return <Clock className="h-4 w-4" />;
    default:
      return null;
  }
};

// Main component
const ReviewPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [results, setResults] = useState<Array<{ wordId: number | string; isCorrect: boolean }>>(
    []
  );
  const [animateCard, setAnimateCard] = useState(false);
  const optionsRef = useRef<string[][]>([]);

  // React Query for fetching words
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reviewWords'],
    queryFn: fetchReviewWords,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation for submitting results
  const mutation = useMutation({
    mutationFn: submitReviewResult,
    onSuccess: data => {
      console.log('Review updated successfully:', data);
      // No need to invalidate query here since this doesn't change the current session
    },
    onError: error => {
      console.error('Error updating review:', error);
      toast.error('Failed to save your answer. Please try again.');
    },
  });

  // Initialize options for all words once data is loaded
  useEffect(() => {
    if (data?.words && data.words.length > 0) {
      // Generate options for all words at once
      const allOptions = data.words.map((currentWord: ReviewWord) => {
        const correctAnswer = currentWord.definition;

        // Get other words as distractors
        let distractors = data.words.filter((w: ReviewWord) => w.id !== currentWord.id).map((w: ReviewWord) => w.definition);

        // If we don't have enough words, add some generic distractors
        const genericDistractors = [
          'The state of being excited or aroused',
          'A person who shows great enthusiasm',
          'To move quickly in a specific direction',
          'An object used for measurement',
          'A small part of something larger',
          'The act of preventing something',
          'A type of traditional ceremony',
          'Someone who provides assistance',
          'A tool used for specific tasks',
          'The quality of being reliable',
        ];

        if (distractors.length < 3) {
          distractors = [...distractors, ...genericDistractors];
        }

        // Select 3 random distractors
        distractors = shuffleArray(distractors).slice(0, 3);

        // Combine correct answer and distractors, then shuffle
        return shuffleArray([correctAnswer, ...distractors]);
      });

      optionsRef.current = allOptions;
      setOptions(allOptions[0]);
    }
  }, [data?.words]);

  // Play audio function
  const playAudio = (audioUrl: string | undefined) => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audio.play().catch(e => {
      console.error('Error playing audio:', e);
      toast.error('Could not play audio');
    });
  };

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    if (showAnswer) return; // Prevent changing after showing answer
    setSelectedOption(option);
  };

  // Handle submitting answer
  const handleSubmitAnswer = () => {
    if (!data?.words || currentIndex >= data.words.length || !selectedOption) return;

    const currentWord = data.words[currentIndex];
    const isCorrect = selectedOption === currentWord.definition;

    // Show the answer
    setShowAnswer(true);

    // Record the result
    const newResults = [...results, { wordId: currentWord.id, isCorrect }];
    setResults(newResults);

    // Submit to API immediately
    mutation.mutate({ wordId: currentWord.id, isCorrect });
  };

  // Handle next question
  const handleNext = () => {
    if (!data?.words || currentIndex >= data.words.length) return;

    // If answer not yet shown, show it first
    if (!showAnswer && selectedOption) {
      handleSubmitAnswer();
      return;
    }

    // Prepare animation
    setAnimateCard(true);

    // Move to next word after a short delay for animation
    setTimeout(() => {
      if (currentIndex < data.words.length - 1) {
        setCurrentIndex(prevIndex => prevIndex + 1);
        setSelectedOption(null);
        setShowAnswer(false);
        setOptions(optionsRef.current[currentIndex + 1]);
      }
      setAnimateCard(false);
    }, 300);
  };

  // Handle start over
  const handleStartOver = () => {
    queryClient.invalidateQueries({ queryKey: ['reviewWords'] });
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setResults([]);
  };

  // Calculate stats
  const calculateStats = () => {
    if (!results.length) return { correct: 0, incorrect: 0, percentage: 0 };

    const correct = results.filter(r => r.isCorrect).length;
    const incorrect = results.length - correct;
    const percentage = Math.round((correct / results.length) * 100);

    return { correct, incorrect, percentage };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Ôn tập từ vựng</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center p-8 border rounded-xl bg-red-50">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-red-700">Đã xảy ra lỗi</h1>
          <p className="text-gray-700 mb-6">
            {error instanceof Error ? error.message : 'Không thể tải dữ liệu ôn tập'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/wordlist')} variant="outline">
              Quay lại danh sách từ
            </Button>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['reviewWords'] })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No words to review
  if (!data?.words || data.words.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center p-8 border rounded-xl bg-gray-50">
          <h1 className="text-2xl font-bold mb-4">Chưa có từ cần ôn tập</h1>
          <p className="text-gray-600 mb-6">
            Hiện tại bạn chưa có từ nào cần ôn tập. Hãy thêm từ mới hoặc quay lại sau nhé!
          </p>
          <Button onClick={() => router.push('/wordlist')}>Quay lại danh sách từ</Button>
        </div>
      </div>
    );
  }

  // Session completed
  if (currentIndex >= data.words.length) {
    const { correct, incorrect, percentage } = calculateStats();

    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="text-center p-8 border rounded-xl bg-gradient-to-b from-blue-50 to-indigo-50 shadow-sm">
          <Sparkles className="h-16 w-16 text-indigo-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-6">Hoàn thành phiên ôn tập!</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-green-600">{correct}</p>
              <p className="text-sm text-gray-600">Đúng</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-red-500">{incorrect}</p>
              <p className="text-sm text-gray-600">Sai</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-blue-600">{percentage}%</p>
              <p className="text-sm text-gray-600">Chính xác</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md mx-auto mb-8">
            <h2 className="text-lg font-medium">Phân loại từ đã ôn tập</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-100">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-gray-700">Mới: {data.stats.totalNew}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-100">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span className="text-gray-700">Đang học: {data.stats.learning}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-100">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span className="text-gray-700">Quen thuộc: {data.stats.familiar}</span>
              </div>
              <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-100">
                <Clock className="h-4 w-4 text-rose-600" />
                <span className="text-gray-700">Đã quên: {data.stats.forgotten}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => router.push('/wordlist')}
              variant="outline"
              className="sm:flex-1 max-w-[200px]"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Danh sách từ
            </Button>
            <Button onClick={handleStartOver} className="sm:flex-1 max-w-[200px]">
              <RefreshCw className="mr-2 h-4 w-4" />
              Ôn tập tiếp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Active review session
  const currentWord = data.words[currentIndex];
  const stats = calculateStats();

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4">
      <Toaster position="top-center" />

      {/* Top Header Area */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Ôn tập từ vựng</h1>
            <Badge variant="outline" className="font-medium">
              {currentIndex + 1}/{data.words.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
              <span>Đúng: {stats.correct}</span>
              <span className="mx-1">|</span>
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
              <span>Sai: {stats.incorrect}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-gray-600">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Bắt đầu lại
            </Button>
          </div>
        </div>
        <Progress
          value={(currentIndex / data.words.length) * 100}
          className="mt-3 h-2 bg-gray-100"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`${
            animateCard ? 'opacity-0 transform translate-y-8 transition-all duration-300' : ''
          }`}
        >
          {/* Two-column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column - Word Information */}
            <div className="md:col-span-5">
              <Card className="h-full p-6 shadow-md border border-gray-200 relative overflow-hidden">
                {/* Background accent color */}
                <div
                  className={`absolute top-0 left-0 w-full h-1.5
                    ${currentWord.status === 'new' ? 'bg-amber-400' : ''}
                    ${currentWord.status === 'learning' ? 'bg-blue-500' : ''}
                    ${currentWord.status === 'familiar' ? 'bg-emerald-500' : ''}
                    ${currentWord.status === 'forgotten' ? 'bg-rose-500' : ''}
                  `}
                ></div>

                {/* Word and Part of Speech */}
                <div className="mb-4">
                  <h2 className="text-4xl font-bold text-gray-800">{currentWord.word}</h2>
                  {currentWord.partOfSpeech && (
                    <p className="text-sm text-gray-500 italic mt-1">{currentWord.partOfSpeech}</p>
                  )}
                </div>

                {/* Status and Priority Badges */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <Badge
                    variant="outline"
                    className={`
                      ${
                        currentWord.status === 'new'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : ''
                      }
                      ${
                        currentWord.status === 'learning'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : ''
                      }
                      ${
                        currentWord.status === 'familiar'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ''
                      }
                      ${
                        currentWord.status === 'forgotten'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : ''
                      }
                    `}
                  >
                    <StatusIcon status={currentWord.status} />
                    <span className="ml-1 capitalize">{currentWord.status}</span>
                  </Badge>
                  <Badge
                    variant={
                      currentWord.priority === 'high'
                        ? 'destructive'
                        : currentWord.priority === 'medium'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {currentWord.priority === 'high'
                      ? 'Ưu tiên cao'
                      : currentWord.priority === 'medium'
                      ? 'Ưu tiên vừa'
                      : 'Ưu tiên thấp'}
                  </Badge>
                </div>

                {/* Pronunciation */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Phát âm</h3>
                  <div className="flex flex-col gap-2">
                    {/* IPA pronunciation */}
                    {(currentWord.ukIpa || currentWord.usIpa) && (
                      <div className="flex flex-wrap gap-2 text-sm">
                        {currentWord.ukIpa && (
                          <span className="inline-flex items-center bg-blue-50 px-2 py-1 rounded text-blue-700">
                            UK: /{currentWord.ukIpa}/
                          </span>
                        )}
                        {currentWord.usIpa && (
                          <span className="inline-flex items-center bg-red-50 px-2 py-1 rounded text-red-700">
                            US: /{currentWord.usIpa}/
                          </span>
                        )}
                      </div>
                    )}

                    {/* Audio buttons */}
                    <div className="flex gap-2 mt-1">
                      {currentWord.ukAudioUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(currentWord.ukAudioUrl)}
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Volume2 className="h-4 w-4" />
                          <span className="font-semibold">UK</span>
                        </Button>
                      )}
                      {currentWord.usAudioUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(currentWord.usAudioUrl)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                        >
                          <Volume2 className="h-4 w-4" />
                          <span className="font-semibold">US</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress stats */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-500">Thông tin học tập</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Số lần ôn tập</p>
                      <p className="font-medium text-gray-800">{currentWord.totalReviews} lần</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Streak hiện tại</p>
                      <p className="font-medium text-gray-800">
                        {currentWord.currentStreak} lần đúng liên tiếp
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Số lần đúng</p>
                      <p className="font-medium text-gray-800">{currentWord.correctCount} lần</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Tỷ lệ đúng</p>
                      <p className="font-medium text-gray-800">
                        {currentWord.totalReviews
                          ? Math.round((currentWord.correctCount / currentWord.totalReviews) * 100)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Quiz Options */}
            <div className="md:col-span-7">
              <Card className="h-full p-6 shadow-md border border-gray-200 relative overflow-hidden flex flex-col">
                {/* Multiple choice options */}
                <div className="flex-grow">
                  <h3 className="text-lg font-medium mb-4">Chọn nghĩa đúng:</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {options.map((option, index) => (
                      <Button
                        key={index}
                        variant={selectedOption === option ? 'default' : 'outline'}
                        className={`justify-start text-left h-auto py-3 px-4
                          ${
                            showAnswer && option === currentWord.definition
                              ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                              : showAnswer &&
                                selectedOption === option &&
                                option !== currentWord.definition
                              ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              : ''
                          }
                        `}
                        onClick={() => handleOptionSelect(option)}
                        disabled={showAnswer}
                      >
                        <div className="flex w-full items-start">
                          <div className="mr-2 mt-0.5 flex-shrink-0">
                            {showAnswer && option === currentWord.definition ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : showAnswer && selectedOption === option ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center">
                                {String.fromCharCode(65 + index)}
                              </div>
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </Button>
                    ))}
                  </div>

                  {/* Warning if no option is selected */}
                  {!showAnswer && selectedOption === null && (
                    <div className="text-amber-600 flex items-center mt-2 mb-4">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <span className="text-sm">Hãy chọn một đáp án</span>
                    </div>
                  )}
                </div>

                {/* Explanation for correct answer (only shown after answering) */}
                {showAnswer && (
                  <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">Định nghĩa chi tiết:</h4>
                    <Tabs defaultValue="en" className="w-full">
                      <TabsList className="mb-2">
                        <TabsTrigger value="en">English</TabsTrigger>
                        <TabsTrigger value="vn">Tiếng Việt</TabsTrigger>
                      </TabsList>
                      <TabsContent value="en" className="text-gray-800">
                        {currentWord.definition}
                      </TabsContent>
                      <TabsContent value="vn" className="text-gray-800">
                        {currentWord.vnDefinition || 'Không có bản dịch tiếng Việt'}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end mt-auto pt-4">
                  {!showAnswer ? (
                    <Button
                      variant="default"
                      onClick={handleSubmitAnswer}
                      disabled={!selectedOption}
                      className="min-w-[120px]"
                    >
                      Kiểm tra
                    </Button>
                  ) : (
                    <Button variant="default" onClick={handleNext} className="min-w-[120px]">
                      Tiếp tục
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Keyboard Shortcuts Info */}
      <div className="mt-4 text-xs text-gray-400 flex items-center justify-center">
        <Info className="h-3 w-3 mr-1" />
        <span>Sử dụng phím 1-4 để chọn đáp án, Enter để kiểm tra/tiếp tục</span>
      </div>
    </div>
  );
};

export default ReviewPage;
