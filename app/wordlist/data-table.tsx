'use client';

import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusCounts?: Record<string, number>;
  onPageChange: (page: number) => void;
  onSearch: (value: string) => void;
  onStatusChange: (status: string) => void;
  selectedStatus?: string;
  isLoading: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  statusCounts,
  onPageChange,
  onSearch,
  onStatusChange,
  selectedStatus,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  const handleSearch = () => {
    onSearch(searchValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Input
              placeholder="Search words..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full"
            />
            <Button
              className="absolute right-0 top-0 h-full px-3"
              variant="ghost"
              onClick={handleSearch}
            >
              🔍
            </Button>
          </div>

          <Select value={selectedStatus || 'all'} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                🔍 All statuses (
                {statusCounts ? Object.values(statusCounts).reduce((a, b) => a + b, 0) : 0})
              </SelectItem>
              <SelectItem value="new">🆕 New ({statusCounts?.new || 0})</SelectItem>
              <SelectItem value="learning">📚 Learning ({statusCounts?.learning || 0})</SelectItem>
              <SelectItem value="familiar">✨ Familiar ({statusCounts?.familiar || 0})</SelectItem>
              <SelectItem value="mastered">🏆 Mastered ({statusCounts?.mastered || 0})</SelectItem>
              <SelectItem value="forgotten">
                ❌ Forgotten ({statusCounts?.forgotten || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-gray-500 font-medium">
          Total: <span className="text-blue-600">{pagination.total}</span> words
        </div>
      </div>

      {/* Notion-style Table */}
      <Card className="border overflow-hidden p-0 shadow-sm">
        <div className="overflow-x-auto">
          <style jsx global>{`
            .notion-table th {
              background-color: #f9fafb;
              font-weight: 500;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
              color: #4b5563;
              position: sticky;
              top: 0;
              z-index: 10;
            }

            .notion-table td,
            .notion-table th {
              border-right: 1px solid #e5e7eb;
            }

            .notion-table td:last-child,
            .notion-table th:last-child {
              border-right: none;
            }

            .notion-table tr {
              border-bottom: 1px solid #e5e7eb;
            }

            .notion-table tr:last-child {
              border-bottom: none;
            }

            .notion-table tr:hover {
              background-color: rgba(236, 242, 254, 0.5);
            }

            .notion-table tr:nth-child(even) {
              background-color: rgba(249, 250, 251, 0.5);
            }
          `}</style>

          <Table className="w-full border-collapse notion-table">
            <TableHeader>
              <TableRow>
                {table.getHeaderGroups().map(headerGroup =>
                  headerGroup.headers.map((header, i) => {
                    // Màu nền nhẹ nhàng cho từng cột
                    const getHeaderStyle = (index: number) => {
                      switch (index) {
                        case 0:
                          return 'bg-slate-100 text-slate-700 border-slate-200'; // Word
                        case 1:
                          return 'bg-indigo-100 text-indigo-700 border-indigo-200'; // Pronunciation
                        case 2:
                          return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Meanings
                        case 3:
                          return 'bg-amber-100 text-amber-700 border-amber-200'; // Examples
                        case 4:
                          return 'bg-rose-100 text-rose-700 border-rose-200'; // Status
                        default:
                          return 'bg-gray-100 text-gray-700 border-gray-200';
                      }
                    };

                    return (
                        <TableHead
                          key={header.id}
                          className={`h-11 px-3 py-2 text-left font-medium text-sm border-r last:border-r-0 ${getHeaderStyle(i)}`}
                          style={{
                            width:
                              i === 0
                                ? '80px'   // Word
                                : i === 1
                                ? '80px'   // Pronunciation
                                : i === 2
                                ? '120px'  // Meanings
                                : i === 3
                                ? '250px'  // Examples
                                : '150px', // Status or others
                            minWidth:
                              i === 0
                                ? '80px'
                                : i === 1
                                ? '80px'
                                : i === 2
                                ? '120px'
                                : i === 3
                                ? '250px'
                                : '150px',
                            maxWidth:
                              i === 0
                                ? '80px'
                                : i === 1
                                ? '80px'
                                : i === 2
                                ? '120px'
                                : i === 3
                                ? '250px'
                                : '150px',
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                    );
                  })
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex} className="p-0">
                        <div className="p-">
                          <div className="h-6 w-full animate-pulse rounded-md bg-gray-100"></div>
                          <div className="h-4 w-2/3 mt-2 animate-pulse rounded-md bg-gray-100"></div>
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell, i) => (
                      <TableCell
                        key={cell.id}
                        className="p-0"
                        style={{
                          width:
                            i === 0
                              ? '15%'
                              : i === 1
                              ? '15%'
                              : i === 2
                              ? '30%'
                              : i === 3
                              ? '20%'
                              : '20%',
                          verticalAlign: 'top',
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <div className="text-4xl mb-2">📝</div>
                      <div className="text-lg font-medium">No results found</div>
                      <div className="text-sm">Try adjusting your search or filter criteria</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-sm text-gray-500">
          Showing page <span className="font-medium text-blue-600">{pagination.page}</span> of{' '}
          <span className="font-medium text-blue-600">{pagination.totalPages}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className="disabled:opacity-50"
          >
            ← Previous
          </Button>
          <span className="text-sm text-gray-500 px-2">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className="disabled:opacity-50"
          >
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
