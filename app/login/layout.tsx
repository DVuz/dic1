import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Login - D'vocab",
  description: "Login page for the D'vocab application",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
