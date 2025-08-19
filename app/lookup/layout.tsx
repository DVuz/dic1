
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "LookUp - D'vocab",
  description: "Look up words and their meanings in D'vocab",
};

export default function LookUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
