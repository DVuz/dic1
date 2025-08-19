import { columns,Payment } from './column';
import { DataTable } from './data-table';

// Fake data
const data: Payment[] = [
  { id: '1', status: 'pending', email: 'a@example.com', amount: 1000 },
  { id: '2', status: 'success', email: 'b@example.com', amount: 2000 },
  { id: '3', status: 'failed', email: 'c@example.com', amount: 1500 },
];

export default function PaymentsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-xl font-bold mb-4">Payments</h1>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
