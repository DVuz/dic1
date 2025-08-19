'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
  Search,
  SlidersHorizontal,
  Target,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Types
interface UserWord {
  id: number;
  word: string;
  definition: string;
  status: string;
  priority: string;
  nextReviewAt: string | null;
  lastReviewedAt: string | null;
  totalReviews: number;
  correctCount: number;
  currentStreak: number;
  partOfSpeech?: string;
  vnDefinition?: string;
  ukIpa?: string;
  usIpa?: string;
  ukAudioUrl?: string;
  usAudioUrl?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatusCounts {
  new?: number;
  learning?: number;
  familiar?: number;
  mastered?: number;
  forgotten?: number;
}

interface WordsResponse {
  success: boolean;
  data: {
    words: UserWord[];
    pagination: Pagination;
    stats: {
      total: number;
      statusCounts: StatusCounts;
    };
  };
}

// Status Icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'new':
      return <Target className="h-4 w-4 text-amber-600" />;
    case 'learning':
      return <BookOpen className="h-4 w-4 text-blue-600" />;
    case 'familiar':
      return <Trophy className="h-4 w-4 text-emerald-600" />;
    case 'forgotten':
      return <Clock className="h-4 w-4 text-rose-600" />;
    default:
      return <CheckCircle className="h-4 w-4 text-gray-600" />;
  }
};

// Status Badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusProps = () => {
    switch (status) {
      case 'new':
        return {
          label: 'Mới',
          variant: 'outline',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'learning':
        return {
          label: 'Đang học',
          variant: 'outline',
          className: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'familiar':
        return {
          label: 'Quen thuộc',
          variant: 'outline',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'forgotten':
        return {
          label: 'Đã quên',
          variant: 'outline',
          className: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'mastered':
        return {
          label: 'Đã thuộc',
          variant: 'outline',
          className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      default:
        return { label: status, variant: 'outline', className: '' };
    }
  };

  const { label, variant, className } = getStatusProps();

  return (
    <div className="flex items-center">
      <StatusIcon status={status} />
      <Badge variant="outline" className={`ml-1.5 ${className}`}>
        {label}
      </Badge>
    </div>
  );
};

// Format date helper
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

// Fetch vocabulary list
const fetchVocabulary = async (
  page: number = 1,
  limit: number = 10,
  status?: string,
  search?: string
): Promise<WordsResponse> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  if (status && status !== 'all') params.append('status', status);
  if (search) params.append('search', search);

  const response = await fetch(`/api/wordlist?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch vocabulary');
  }
  return response.json();
};

// Play audio function
const playAudio = (audioUrl: string | undefined) => {
  if (!audioUrl) {
    toast.error('Không có file âm thanh');
    return;
  }

  const audio = new Audio(audioUrl);
  audio.play().catch(e => {
    console.error('Error playing audio:', e);
    toast.error('Không thể phát âm thanh');
  });
};

// Main WordTable component
const WordTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 10;

  // React Query for fetching words
  const { data, isLoading, isError, error, refetch } = useQuery<WordsResponse>({
    queryKey: ['userWords', page, limit, status, search],
    queryFn: () => fetchVocabulary(page, limit, status, search),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  // Handle search
  const handleSearch = () => {
    setSearch(searchTerm);
    setIsSearching(false);
  };

  // Handle key press for search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearch('');
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? undefined : value);
  };

  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = data?.data.pagination.totalPages || 1;
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Get pagination info
  const getPaginationInfo = () => {
    const pagination = data?.data.pagination;
    if (!pagination) return 'Không có dữ liệu';

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}-${end} / ${pagination.total} từ`;
  };

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-gray-500">Đang tải danh sách từ vựng...</p>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <X className="w-10 h-10 text-red-500" />
        <p className="text-red-500 font-medium">Lỗi khi tải danh sách từ vựng</p>
        <p className="text-gray-500 text-sm">
          {error instanceof Error ? error.message : 'Đã có lỗi xảy ra'}
        </p>
        <Button onClick={() => refetch()}>Thử lại</Button>
      </div>
    );
  }

  // Get words and stats
  const words = data?.data.words || [];
  const totalWords = data?.data.stats.total || 0;
  const statusCounts = data?.data.stats.statusCounts || {};
  const pagination = data?.data.pagination || { page: 1, limit, total: 0, totalPages: 1 };

  // Empty state
  if (words.length === 0) {
    return (
      <div className="space-y-4">
        {/* Search & Filter Section */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex-1 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Tìm từ vựng..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9 pr-9 h-10"
              />
              {searchTerm && (
                <button
                  className="absolute right-2.5 top-2.5"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-500 hover:text-gray-900" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSearch} disabled={!searchTerm}>
              <Search className="h-4 w-4 mr-2" />
              Tìm kiếm
            </Button>

            <Select value={status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[160px]">
                <div className="flex items-center">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tất cả trạng thái" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Trạng thái</SelectLabel>
                  <SelectItem value="all">Tất cả ({totalWords})</SelectItem>
                  <SelectItem value="new">Mới ({statusCounts.new || 0})</SelectItem>
                  <SelectItem value="learning">Đang học ({statusCounts.learning || 0})</SelectItem>
                  <SelectItem value="familiar">
                    Quen thuộc ({statusCounts.familiar || 0})
                  </SelectItem>
                  <SelectItem value="forgotten">Đã quên ({statusCounts.forgotten || 0})</SelectItem>
                  <SelectItem value="mastered">Đã thuộc ({statusCounts.mastered || 0})</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="text-center space-y-3">
              <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
              <CardTitle>Không tìm thấy từ vựng</CardTitle>
              <p className="text-gray-500">
                {search
                  ? `Không tìm thấy từ vựng nào phù hợp với "${search}"`
                  : status
                  ? `Không có từ vựng nào ở trạng thái "${status}"`
                  : 'Danh sách từ vựng của bạn đang trống'}
              </p>
              <div className="pt-4">
                <Button variant="outline" onClick={handleClearSearch}>
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 relative">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Tìm từ vựng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-9 pr-9 h-10"
            />
            {searchTerm && (
              <button
                className="absolute right-2.5 top-2.5"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-gray-500 hover:text-gray-900" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSearch} disabled={!searchTerm}>
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>

          <Select value={status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tất cả trạng thái" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Trạng thái</SelectLabel>
                <SelectItem value="all">Tất cả ({totalWords})</SelectItem>
                <SelectItem value="new">Mới ({statusCounts.new || 0})</SelectItem>
                <SelectItem value="learning">Đang học ({statusCounts.learning || 0})</SelectItem>
                <SelectItem value="familiar">Quen thuộc ({statusCounts.familiar || 0})</SelectItem>
                <SelectItem value="forgotten">Đã quên ({statusCounts.forgotten || 0})</SelectItem>
                <SelectItem value="mastered">Đã thuộc ({statusCounts.mastered || 0})</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Card className="shadow-sm bg-amber-50 border-amber-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-amber-600 mr-1.5" />
                <span className="text-xs font-medium text-amber-800">Mới</span>
              </div>
              <span className="text-sm font-bold text-amber-900">{statusCounts.new || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-blue-50 border-blue-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 text-blue-600 mr-1.5" />
                <span className="text-xs font-medium text-blue-800">Đang học</span>
              </div>
              <span className="text-sm font-bold text-blue-900">{statusCounts.learning || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-emerald-50 border-emerald-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-emerald-600 mr-1.5" />
                <span className="text-xs font-medium text-emerald-800">Quen thuộc</span>
              </div>
              <span className="text-sm font-bold text-emerald-900">
                {statusCounts.familiar || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-rose-50 border-rose-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-rose-600 mr-1.5" />
                <span className="text-xs font-medium text-rose-800">Đã quên</span>
              </div>
              <span className="text-sm font-bold text-rose-900">{statusCounts.forgotten || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-indigo-50 border-indigo-100">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-indigo-600 mr-1.5" />
                <span className="text-xs font-medium text-indigo-800">Đã thuộc</span>
              </div>
              <span className="text-sm font-bold text-indigo-900">
                {statusCounts.mastered || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Words Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Từ vựng</TableHead>
              <TableHead>Nghĩa</TableHead>
              <TableHead className="w-[120px]">Trạng thái</TableHead>
              <TableHead className="w-[100px] text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {words.map(word => (
              <TableRow key={word.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-base font-medium">{word.word}</span>
                    {(word.ukIpa || word.usIpa) && (
                      <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-500">
                        {word.ukIpa && <span>UK: /{word.ukIpa}/</span>}
                        {word.usIpa && <span>US: /{word.usIpa}/</span>}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{word.definition}</span>
                    {word.vnDefinition && (
                      <span className="text-xs text-gray-500 mt-1 italic">{word.vnDefinition}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={word.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {word.ukAudioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => playAudio(word.ukAudioUrl)}
                        title="Phát âm UK"
                      >
                        <Volume2 className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {word.usAudioUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => playAudio(word.usAudioUrl)}
                        title="Phát âm US"
                      >
                        <Volume2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <div className="text-sm text-gray-500">{getPaginationInfo()}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={page <= 1}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Trước
          </Button>
          <span className="text-sm">
            Trang {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={page >= pagination.totalPages}
          >
            Sau
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WordTable;
