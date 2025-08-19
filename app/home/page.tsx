'use client';
import { Button } from '@/components/ui/button';
import { LoadingFullPage } from '@/components/ui/loading';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LoadingFullPage />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Session Status */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Chi tiết Session - useSession()
            </h1>

            {/* Status Information */}
            <div className="bg-blue-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Trạng thái Session</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                      status === 'authenticated'
                        ? 'bg-green-100 text-green-800'
                        : status === 'loading'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Session exists:</span>
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                      session ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {session ? 'true' : 'false'}
                  </span>
                </div>
              </div>
            </div>

            {/* User Information */}
            {session?.user && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Thông tin User</h2>
                <div className="flex items-start space-x-6">
                  {session.user.image && (
                    <div className="flex-shrink-0">
                      <Image
                        src={session.user.image}
                        alt="Profile"
                        width={100}
                        height={100}
                        className="rounded-full border-4 border-white shadow-lg"
                      />
                    </div>
                  )}

                  <div className="flex-grow grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <p className="text-gray-900 font-semibold">{session.user.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <p className="text-gray-900">{session.user.email || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Image URL:</span>
                      <p className="text-gray-600 text-sm break-all">
                        {session.user.image || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">User ID:</span>
                      <p className="text-gray-600 text-sm">{(session.user as { id?: string })?.id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session Details */}
            <div className="bg-green-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Chi tiết Session</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Expires:</span>
                  <p className="text-gray-900">{session.expires || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expires (Formatted):</span>
                  <p className="text-gray-900">
                    {session.expires ? new Date(session.expires).toLocaleString('vi-VN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Raw Session Data */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Raw Session Data (JSON)</h2>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-64">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            {/* Additional Runtime Info */}
            <div className="bg-yellow-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Thông tin Runtime</h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Current Time:</span>
                  <p className="text-gray-900">{new Date().toLocaleString('vi-VN')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">User Agent:</span>
                  <p className="text-gray-600 break-all">{navigator.userAgent}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Page URL:</span>
                  <p className="text-gray-600">{window.location.href}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Session Type:</span>
                  <p className="text-gray-900">{typeof session}</p>
                </div>
              </div>
            </div>

            {/* Debug Object Keys */}
            <div className="bg-red-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Debug - Object Keys</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Session Keys:</span>
                  <pre className="bg-white p-2 rounded text-sm mt-1">
                    {JSON.stringify(Object.keys(session || {}), null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="font-medium text-gray-700">User Keys:</span>
                  <pre className="bg-white p-2 rounded text-sm mt-1">
                    {JSON.stringify(Object.keys(session?.user || {}), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
                onClick={() => {
                }}
              >
                Log Session to Console
              </Button>

              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>

              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 py-3"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
