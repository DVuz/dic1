'use client';

import { ColumnDef } from '@tanstack/react-table';

export type Payment = {
  id: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  email: string;
};

// Cấu hình cột
export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
  },
];
