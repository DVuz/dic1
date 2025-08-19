'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  History,
  Home,
  List,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  User,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { data: session, status } = useSession();
  console.log('Header', session);
  const router = useRouter();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo và tên app */}
        <div
          className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push('/')}
        >
          <Image
            src="https://res.cloudinary.com/dfizo8h6h/image/upload/v1753282364/ChatGPT_Image_Jul_23_2025_07_44_51_PM_xeiyoy.png"
            alt="D'vocab Logo"
            width={48}
            height={48}
            className="rounded-xl shadow-md"
            priority
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-blue-600 tracking-tight">D'vocab</h1>
          </div>
        </div>

        {/* Navigation Menu - Chỉ hiển thị khi đã đăng nhập */}
        {status === 'authenticated' && session?.user && (
          <nav className="hidden md:flex items-center space-x-1">
            {/* <Button
              variant="ghost"
              onClick={() => handleNavigation('/home')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Home className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">Trang chủ</span>
            </Button> */}

            <Button
              variant="ghost"
              onClick={() => handleNavigation('/lookup')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-green-600" />
              <span className="font-medium text-gray-700">Thêm từ mới</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => handleNavigation('/wordlist')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <List className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700">Danh sách từ</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => handleNavigation('/review')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-gray-700">Ôn tập</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => handleNavigation('/reviewHistory')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <History className="h-4 w-4 text-indigo-600" />
              <span className="font-medium text-gray-700">Lịch sử ôn tập</span>
            </Button>
          </nav>
        )}

        {/* User menu hoặc Login button */}
        <div className="flex items-center space-x-4">
          {status === 'authenticated' && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-12 w-auto px-4 hover:bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9 border-2 border-gray-200">
                      <AvatarImage
                        src={session.user.image || ''}
                        alt={session.user.name || 'User'}
                      />
                      <AvatarFallback className="text-sm font-medium bg-blue-100 text-blue-600">
                        {session.user.name ? getUserInitials(session.user.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start text-left">
                      <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
                        {session.user.name}
                      </span>
                      <span className="text-xs text-gray-500 max-w-[120px] truncate">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72 mr-4" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 border-2 border-gray-200">
                        <AvatarImage
                          src={session.user.image || ''}
                          alt={session.user.name || 'User'}
                        />
                        <AvatarFallback className="text-lg font-medium bg-blue-100 text-blue-600">
                          {session.user.name ? getUserInitials(session.user.name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="w-fit text-xs px-2 py-1 bg-green-100 text-green-700"
                    >
                      ● Đã đăng nhập
                    </Badge>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Mobile Navigation - Hiển thị trong dropdown trên mobile */}
                <div className="md:hidden">
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => handleNavigation('/home')}
                      className="cursor-pointer p-3 rounded-lg"
                    >
                      <Home className="mr-3 h-4 w-4 text-blue-600" />
                      <span className="font-medium">Trang chủ</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleNavigation('/add-word')}
                      className="cursor-pointer p-3 rounded-lg"
                    >
                      <Plus className="mr-3 h-4 w-4 text-green-600" />
                      <span className="font-medium">Thêm từ mới</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleNavigation('/word-list')}
                      className="cursor-pointer p-3 rounded-lg"
                    >
                      <List className="mr-3 h-4 w-4 text-purple-600" />
                      <span className="font-medium">Danh sách từ</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleNavigation('/review')}
                      className="cursor-pointer p-3 rounded-lg"
                    >
                      <RotateCcw className="mr-3 h-4 w-4 text-orange-600" />
                      <span className="font-medium">Ôn tập</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleNavigation('/reviewHistory')}
                      className="cursor-pointer p-3 rounded-lg"
                    >
                      <History className="mr-3 h-4 w-4 text-indigo-600" />
                      <span className="font-medium">Lịch sử ôn tập</span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />
                </div>

                <div className="p-1">
                  <DropdownMenuItem
                    onClick={() => handleNavigation('/profile')}
                    className="cursor-pointer p-3 rounded-lg"
                  >
                    <User className="mr-3 h-4 w-4 text-gray-600" />
                    <span className="font-medium">Hồ sơ cá nhân</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => handleNavigation('/settings')}
                    className="cursor-pointer p-3 rounded-lg"
                  >
                    <Settings className="mr-3 h-4 w-4 text-gray-600" />
                    <span className="font-medium">Cài đặt</span>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator />

                <div className="p-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer p-3 rounded-lg text-red-600 hover:bg-red-50 focus:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="font-medium">Đăng xuất</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : status === 'loading' ? (
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
              <div className="hidden sm:block space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                <div className="h-2 w-20 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => router.push('/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
