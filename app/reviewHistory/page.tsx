'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  LineChart,
  ListChecks,
  Loader2,
  XCircle,
  Target,
  Award,
  BookOpen,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
interface ReviewWord {
  id: number;
  word: string;
  definition: string;
  status: string;
  currentStreak: number;
  correctCount: number;
  totalReviews: number;
  lastReviewedAt: string;
}

interface DailyStats {
  date: string;
  totalReviews: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracy: number;
  wordsByStatus: Record<string, number>;
  words: ReviewWord[];
}

interface ReviewSummary {
  period: string;
  totalDays: number;
  totalReviews: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  wordsByStatus: Record<string, number>;
  averageWordsPerDay: number;
  bestDay: string | null;
  streakInfo: {
    currentStreak: number;
    longestStreak: number;
    totalActiveDays: number;
  };
}

interface ReviewHistoryData {
  summary: ReviewSummary;
  dailyStats: DailyStats[];
}

// Fetch review history data
const fetchReviewHistory = async (period: string): Promise<ReviewHistoryData> => {
  const response = await fetch(`/api/reviewHistory?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch review history');
  }
  const data = await response.json();
  return data.data;
};

// Status Icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'new':
      return <Target className="h-4 w-4 text-amber-500" />;
    case 'learning':
      return <BookOpen className="h-4 w-4 text-blue-500" />;
    case 'familiar':
      return <Trophy className="h-4 w-4 text-emerald-500" />;
    case 'forgotten':
      return <Clock className="h-4 w-4 text-rose-500" />;
    case 'mastered':
      return <Award className="h-4 w-4 text-indigo-500" />;
    default:
      return null;
  }
};

// Vietnamese weekday names
const weekdayNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

// Format date helper without date-fns
const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const weekday = weekdayNamesVi[date.getDay()];

  return `${weekday}, ${day}/${month}/${year}`;
};

// Format simple date (dd/mm/yyyy)
const formatSimpleDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Main component
const ReviewHistoryPage = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7d');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // React Query hook
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reviewHistory', selectedPeriod],
    queryFn: () => fetchReviewHistory(selectedPeriod),
  });

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
  };

  // Toggle expanded day
  const toggleExpandDay = (date: string) => {
    if (expandedDay === date) {
      setExpandedDay(null);
    } else {
      setExpandedDay(date);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Lịch sử ôn tập</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="text-center p-8 border rounded-xl bg-red-50">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-red-700">Đã xảy ra lỗi</h1>
          <p className="text-gray-700 mb-6">
            {error instanceof Error ? error.message : 'Không thể tải dữ liệu lịch sử ôn tập'}
          </p>
          <Button onClick={() => refetch()}>Thử lại</Button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || !data.dailyStats || data.dailyStats.length === 0) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Lịch sử ôn tập</h1>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Hôm nay</SelectItem>
              <SelectItem value="7d">7 ngày qua</SelectItem>
              <SelectItem value="30d">30 ngày qua</SelectItem>
              <SelectItem value="90d">90 ngày qua</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-center p-8 border rounded-xl bg-gray-50">
          <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Chưa có dữ liệu ôn tập</h2>
          <p className="text-gray-500 mb-6">
            Bạn chưa ôn tập từ vựng nào trong khoảng thời gian này.
          </p>
          <Button onClick={() => (window.location.href = '/review')}>Bắt đầu ôn tập ngay</Button>
        </div>
      </div>
    );
  }

  const { summary, dailyStats } = data;

  return (
    <div className="container  mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử ôn tập</h1>
          <p className="text-gray-500">Theo dõi tiến trình học tập của bạn qua thời gian</p>
        </div>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Chọn khoảng thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Hôm nay</SelectItem>
            <SelectItem value="7d">7 ngày qua</SelectItem>
            <SelectItem value="30d">30 ngày qua</SelectItem>
            <SelectItem value="90d">90 ngày qua</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Streak Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-orange-400"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <Flame className="h-5 w-5 text-orange-500 mr-2" />
              Streak học tập
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{summary.streakInfo.currentStreak}</span>
              <span className="text-gray-500 text-sm mb-1">ngày liên tiếp</span>
            </div>
            <div className="mt-2 text-sm text-gray-500 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Streak dài nhất:</span>
                <span className="font-medium">{summary.streakInfo.longestStreak} ngày</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Số ngày học tập:</span>
                <span className="font-medium">{summary.streakInfo.totalActiveDays} ngày</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-400"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              Độ chính xác
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{summary.overallAccuracy}%</span>
              <span className="text-gray-500 text-sm mb-1">trả lời đúng</span>
            </div>
            <Progress value={summary.overallAccuracy} className="h-2 mt-2" />
            <div className="mt-2 text-sm text-gray-500 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <CheckCircle2 className="h-3 w-3 text-green-500 mr-1" />
                  Đúng:
                </span>
                <span className="font-medium">{summary.totalCorrect} câu</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center">
                  <XCircle className="h-3 w-3 text-red-500 mr-1" />
                  Sai:
                </span>
                <span className="font-medium">{summary.totalIncorrect} câu</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Word Stats Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-400"></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-lg">
              <ListChecks className="h-5 w-5 text-blue-500 mr-2" />
              Thống kê từ vựng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{summary.totalReviews}</span>
              <span className="text-gray-500 text-sm mb-1">lượt ôn tập</span>
            </div>
            <div className="mt-2 text-sm text-gray-500 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Trung bình mỗi ngày:</span>
                <span className="font-medium">{summary.averageWordsPerDay} từ</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ngày học nhiều nhất:</span>
                <span className="font-medium">{formatSimpleDate(summary.bestDay)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daily" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily" className="flex items-center">
            <CalendarDays className="h-4 w-4 mr-2" />
            Hoạt động hàng ngày
          </TabsTrigger>
          <TabsTrigger value="words" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Phân loại từ vựng
          </TabsTrigger>
        </TabsList>

        {/* Daily Activity Tab */}
        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động ôn tập hàng ngày</CardTitle>
              <CardDescription>
                Chi tiết số từ bạn đã ôn tập mỗi ngày và tỷ lệ đúng/sai
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có dữ liệu ôn tập trong khoảng thời gian này
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyStats.map(day => (
                    <div key={day.date} className="border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleExpandDay(day.date)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{formatDate(day.date)}</span>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <span className="flex items-center mr-3">
                              <ListChecks className="h-3.5 w-3.5 mr-1" />
                              {day.totalReviews} từ
                            </span>
                            <span className="flex items-center mr-3">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1" />
                              {day.correctAnswers} đúng
                            </span>
                            <span className="flex items-center">
                              <XCircle className="h-3.5 w-3.5 text-red-500 mr-1" />
                              {day.incorrectAnswers} sai
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Badge
                            variant={
                              day.accuracy >= 80
                                ? 'secondary'
                                : day.accuracy >= 60
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {day.accuracy}% chính xác
                          </Badge>
                          {expandedDay === day.date ? (
                            <ChevronUp className="h-5 w-5 ml-2 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 ml-2 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {expandedDay === day.date && (
                        <div className="p-4 border-t bg-gray-50">
                          <h4 className="font-medium mb-3 text-sm">Chi tiết từ vựng đã ôn tập</h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Từ vựng</TableHead>
                                  <TableHead>Trạng thái</TableHead>
                                  <TableHead>Streak</TableHead>
                                  <TableHead>Tỷ lệ đúng</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {day.words.map(word => (
                                  <TableRow key={word.id}>
                                    <TableCell className="font-medium">{word.word}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center">
                                        <StatusIcon status={word.status} />
                                        <span className="ml-1 capitalize">{word.status}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>{word.currentStreak}</TableCell>
                                    <TableCell>
                                      {word.totalReviews > 0
                                        ? `${Math.round(
                                            (word.correctCount / word.totalReviews) * 100
                                          )}%`
                                        : 'N/A'}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Words Classification Tab */}
        <TabsContent value="words" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân loại từ vựng</CardTitle>
              <CardDescription>Thống kê trạng thái các từ vựng đã ôn tập</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Distribution */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3">Phân bố trạng thái</h3>
                  <div className="space-y-3">
                    {Object.entries(summary.wordsByStatus).map(([status, count]) => (
                      <div key={status} className="flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center">
                            <StatusIcon status={status} />
                            <span className="ml-1 capitalize">{status}</span>
                          </div>
                          <span className="text-sm font-medium">{count} từ</span>
                        </div>
                        <Progress
                          value={(count / summary.totalReviews) * 100}
                          className={`h-2 ${
                            status === 'new'
                              ? 'bg-amber-100'
                              : status === 'learning'
                              ? 'bg-blue-100'
                              : status === 'familiar'
                              ? 'bg-emerald-100'
                              : status === 'forgotten'
                              ? 'bg-rose-100'
                              : status === 'mastered'
                              ? 'bg-indigo-100'
                              : 'bg-gray-100'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learning Progress */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3">Tiến độ học tập</h3>
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="10"
                        />

                        {/* Progress circle - using SVG arc */}
                        {summary.overallAccuracy > 0 && (
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="10"
                            strokeDasharray={`${summary.overallAccuracy * 2.51} 251`}
                            strokeDashoffset="0"
                            transform="rotate(-90 50 50)"
                          />
                        )}

                        {/* Center text */}
                        <text
                          x="50"
                          y="50"
                          textAnchor="middle"
                          dy="0.3em"
                          className="text-2xl font-bold"
                          fill="#0f172a"
                        >
                          {summary.totalReviews}
                        </text>
                        <text x="50" y="65" textAnchor="middle" className="text-xs" fill="#64748b">
                          Lượt ôn tập
                        </text>
                      </svg>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Bạn đã ôn tập{' '}
                        <strong className="text-gray-700">{summary.totalReviews} lượt</strong> với
                        độ chính xác{' '}
                        <strong className="text-gray-700">{summary.overallAccuracy}%</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-center mt-6">
        <Button onClick={() => (window.location.href = '/review')} className="mx-2">
          Ôn tập ngay
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = '/wordlist')}
          className="mx-2"
        >
          Quản lý từ vựng
        </Button>
      </div>
    </div>
  );
};

export default ReviewHistoryPage;
