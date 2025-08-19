import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AddToUserWordsInput, AddToUserWordsResponse } from './type';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Lấy token từ request để xác thực user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    console.log('Received token:', token);

    if (!token || !token.dbUserId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized - Please login first',
          error: 'UNAUTHORIZED',
        } as AddToUserWordsResponse,
        { status: 401 }
      );
    }

    const userId = parseInt(token.dbUserId as string);
    const { wordId, meaningId, personalNote, isFavorite }: AddToUserWordsInput =
      await request.json();

    console.log('Received request to add word to user words:', {
      userId,
      wordId,
      meaningId,
      personalNote,
      isFavorite,
    });

    // Validate input
    if (!wordId || !meaningId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: wordId, meaningId',
          error: 'MISSING_FIELDS',
        } as AddToUserWordsResponse,
        { status: 400 }
      );
    }

    // Kiểm tra xem user có tồn tại không
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        } as AddToUserWordsResponse,
        { status: 404 }
      );
    }

    // Kiểm tra xem word và meaning có tồn tại không
    const wordMeaning = await prisma.wordMeaning.findFirst({
      where: {
        id: meaningId,
        wordId: wordId,
      },
      include: {
        word: true,
      },
    });

    if (!wordMeaning) {
      return NextResponse.json(
        {
          success: false,
          message: 'Word or meaning not found',
          error: 'WORD_MEANING_NOT_FOUND',
        } as AddToUserWordsResponse,
        { status: 404 }
      );
    }

    // Kiểm tra xem user đã thêm từ này chưa
    const existingUserWord = await prisma.userWord.findUnique({
      where: {
        unique_user_word_meaning: {
          userId: userId,
          wordId: wordId,
          wordMeaningId: meaningId,
        },
      },
    });

    if (existingUserWord) {
      return NextResponse.json(
        {
          success: false,
          message: 'Word already added to your vocabulary',
          error: 'ALREADY_EXISTS',
          data: {
            id: existingUserWord.id.toString(),
            wordId: existingUserWord.wordId,
            meaningId: existingUserWord.wordMeaningId,
            userId: existingUserWord.userId,
            status: existingUserWord.status,
            addedAt: existingUserWord.addedAt.toISOString(),
            personalNote: existingUserWord.personalNote || undefined,
            isFavorite: existingUserWord.isFavorite,
          },
        } as AddToUserWordsResponse,
        { status: 409 }
      );
    }

    // Thêm từ vào danh sách học của user
    const userWord = await prisma.userWord.create({
      data: {
        userId: userId,
        wordId: wordId,
        wordMeaningId: meaningId,
        status: 'new',
        personalNote: personalNote || null,
        isFavorite: isFavorite || false,
        // Thiết lập lịch ôn tập đầu tiên (1 ngày sau)
        nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    console.log('Successfully added word to user vocabulary:', {
      userWordId: userWord.id,
      userId: userId,
      wordText: wordMeaning.word.word,
      meaningId: meaningId,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Word "${wordMeaning.word.word}" added to your vocabulary successfully`,
        data: {
          id: userWord.id.toString(),
          wordId: userWord.wordId,
          meaningId: userWord.wordMeaningId,
          userId: userWord.userId,
          status: userWord.status,
          addedAt: userWord.addedAt.toISOString(),
          personalNote: userWord.personalNote || undefined,
          isFavorite: userWord.isFavorite,
        },
      } as AddToUserWordsResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding word to user vocabulary:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while adding word to vocabulary',
        error: 'INTERNAL_ERROR',
      } as AddToUserWordsResponse,
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
