'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Grid, Table } from 'lucide-react';
import { useEffect, useState } from 'react';
import { columns } from './columns';
import { DataTable } from './data-table';
import { WordsResponse } from './types';
import { VocabularyGrid } from './components/VocabularyGrid';

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

export default function VocabularyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const limit = 20;

  const { data, isLoading, refetch } = useQuery<WordsResponse>({
    queryKey: ['vocabulary', page, limit, status, search],
    queryFn: () => fetchVocabulary(page, limit, status, search),
    placeholderData: previousData => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value === 'all' ? undefined : value);
  };

  // Stats
  const words = data?.data.words || [];
  const pagination = data?.data.pagination || { page: 1, limit, total: 0, totalPages: 1 };
  const statusCounts = data?.data.stats.statusCounts || {};

  return (
    <div className="mx-auto py-6 space-y-6">
      <Card className="container mx-auto border-0 shadow-md bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-blue-600" />
                My Vocabulary
              </CardTitle>
              <CardDescription>Manage and review your vocabulary list</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-1"
              >
                <Table className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1"
              >
                <Grid className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="all" className="space-y-4 max-w-9/10 mx-auto">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setStatus(undefined)}>
              All Words
              <Badge variant="secondary" className="ml-2">
                {data?.data.stats.total || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="due" onClick={() => setStatus('new')}>
              Due Today
              <Badge variant="secondary" className="ml-2">
                {statusCounts.new || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {viewMode === 'table' ? (
                <DataTable
                  columns={columns}
                  data={words}
                  pagination={pagination}
                  statusCounts={statusCounts}
                  onPageChange={handlePageChange}
                  onSearch={handleSearch}
                  onStatusChange={handleStatusChange}
                  selectedStatus={status}
                  isLoading={isLoading}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      placeholder="Search words..."
                      className="px-3 py-2 border border-gray-300 rounded-md w-full max-w-xs"
                      value={search}
                      onChange={e => handleSearch(e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      value={status || 'all'}
                      onChange={e => handleStatusChange(e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="new">New</option>
                      <option value="learning">Learning</option>
                      <option value="familiar">Familiar</option>
                      <option value="mastered">Mastered</option>
                      <option value="forgotten">Forgotten</option>
                    </select>
                  </div>
                  <VocabularyGrid
                    words={words}
                    pagination={pagination}
                    isLoading={isLoading}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="due" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {viewMode === 'table' ? (
                <DataTable
                  columns={columns}
                  data={words}
                  pagination={pagination}
                  statusCounts={statusCounts}
                  onPageChange={handlePageChange}
                  onSearch={handleSearch}
                  onStatusChange={handleStatusChange}
                  selectedStatus="new"
                  isLoading={isLoading}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      placeholder="Search words..."
                      className="px-3 py-2 border border-gray-300 rounded-md w-full max-w-xs"
                      value={search}
                      onChange={e => handleSearch(e.target.value)}
                    />
                    <select
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      value="new"
                      disabled
                    >
                      <option value="new">New</option>
                    </select>
                  </div>
                  <VocabularyGrid
                    words={words}
                    pagination={pagination}
                    isLoading={isLoading}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
