import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID ??
        (() => {
          throw new Error('GOOGLE_CLIENT_ID is not set');
        })(),
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ??
        (() => {
          throw new Error('GOOGLE_CLIENT_SECRET is not set');
        })(),
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        try {
          // Kiểm tra user đã tồn tại chưa
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          // Nếu chưa có thì tạo mới
          if (!existingUser) {
            existingUser = await prisma.user.create({
              data: {
                name: user.name,
                email: user.email,
                image: user.image,
                provider: 'google',
              },
            });
          }

          return true;
        } catch (error) {
          console.error('Error handling user:', error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // Thêm database user id vào session
      if (token.dbUserId && session.user) {
        (session.user as any).id = token.dbUserId;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Lấy database user id khi đăng nhập
      if (account?.provider === 'google' && user?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (dbUser) {
            (token as any).dbUserId = dbUser.id.toString();
          }
        } catch (error) {
          console.error('Error getting user id:', error);
        }
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Redirect về trang home sau khi đăng nhập thành công
      if (url.startsWith('/') || url.startsWith(baseUrl)) {
        return `${baseUrl}/home`;
      }
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };
