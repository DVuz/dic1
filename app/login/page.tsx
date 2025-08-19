'use client';
import { Button } from '@/components/ui/button';
import { LoadingDiv, LoadingFullPage, LoadingInline } from '@/components/ui/loading';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/home');
    }
  }, [status, router]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn('google');
    } finally {
      setIsSigningIn(false);
    }
  };

  // 1. Full Page Loading - khi đang check session
  if (status === 'loading') {
    return <LoadingFullPage />;
  }

  if (status === 'authenticated') {
    return null;
  }

  return (
    <>
      {/* ✅ Fixed: Proper centering */}
      <div className="flex items-center justify-center bg-gray-50 px-4 py-8 mt-20">
        <div className="flex w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Left column: image and welcome text */}
          <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-12">
            <div className="text-center max-w-md">
              <div className="mb-8">
                <Image
                  src="https://res.cloudinary.com/dfizo8h6h/image/upload/v1753282364/ChatGPT_Image_Jul_23_2025_07_44_51_PM_xeiyoy.png"
                  alt="D'vocab Logo"
                  width={160}
                  height={160}
                  className="mx-auto mb-6 rounded-2xl shadow-lg"
                  priority
                />
              </div>
              <h2 className="text-4xl font-bold text-blue-700 mb-6 leading-tight">
                Chào mừng đến với D'vocab
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Nền tảng học từ vựng thông minh, hiệu quả và cá nhân hóa. Bắt đầu hành trình học tập
                của bạn ngay hôm nay!
              </p>
            </div>
          </div>

          {/* Right column: login form */}
          <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
            <div className="w-full max-w-sm">
              {/* Mobile logo - only show on small screens */}
              <div className="lg:hidden text-center mb-8">
                <Image
                  src="https://res.cloudinary.com/dfizo8h6h/image/upload/v1753282364/ChatGPT_Image_Jul_23_2025_07_44_51_PM_xeiyoy.png"
                  alt="D'vocab Logo"
                  width={80}
                  height={80}
                  className="mx-auto mb-4 rounded-xl"
                />
                {/* Mobile title */}
                <h2 className="text-2xl font-bold text-blue-700 mb-2">D'vocab</h2>
              </div>

              <div className="text-center mb-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Đăng nhập</h1>
                <p className="text-gray-600 text-lg">Đăng nhập để sử dụng ứng dụng</p>
              </div>

              {/* 2. Div Loading - khi đang đăng nhập */}
              {isSigningIn ? (
                <LoadingDiv className="my-8" />
              ) : (
                <Button
                  className="w-full bg-white hover:bg-gray-50 hover:shadow-lg text-gray-700 font-semibold py-4 px-6 border-2 border-gray-200 hover:border-gray-300 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-sm group"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                >
                  {/* 3. Inline Loading - trong button */}
                  {isSigningIn ? (
                    <LoadingInline className="text-gray-600" size="sm" />
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 48 48"
                      fill="none"
                      className="group-hover:scale-110 transition-transform duration-300"
                    >
                      <g>
                        <path
                          fill="#4285F4"
                          d="M24 9.5c3.54 0 6.73 1.22 9.24 3.22l6.9-6.9C36.36 2.36 30.57 0 24 0 14.82 0 6.73 5.48 2.69 13.44l8.06 6.27C12.89 13.17 17.98 9.5 24 9.5z"
                        />
                        <path
                          fill="#34A853"
                          d="M46.1 24.55c0-1.64-.15-3.22-.42-4.76H24v9.02h12.42c-.54 2.91-2.17 5.38-4.62 7.04l7.19 5.59C43.98 37.44 46.1 31.46 46.1 24.55z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.75 28.71c-.64-1.91-1.01-3.94-1.01-6.21s.37-4.3 1.01-6.21l-8.06-6.27C1.13 13.82 0 18.72 0 24s1.13 10.18 2.69 14.98l8.06-6.27z"
                        />
                        <path
                          fill="#EA4335"
                          d="M24 48c6.57 0 12.09-2.17 16.12-5.91l-7.19-5.59c-2 1.35-4.56 2.15-8.93 2.15-6.02 0-11.11-3.67-13.25-8.98l-8.06 6.27C6.73 42.52 14.82 48 24 48z"
                        />
                      </g>
                    </svg>
                  )}
                  <span className="text-lg">
                    {isSigningIn ? 'Đang đăng nhập...' : 'Đăng nhập với Google'}
                  </span>
                </Button>
              )}

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Bằng việc đăng nhập, bạn đã xác nhận rằng&nbsp;
                  <span className="font-semibold text-indigo-600 underline decoration-indigo-400">
                    Vũ Trần Dũng
                  </span>
                  &nbsp;là người đẹp trai nhất hệ mặt trời!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
