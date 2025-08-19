import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, LearningStatus } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import withoutLogin from '@/helper/withouLogin';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    console.log('Received token:', token);

    if (!token || !token.dbUserId) {
      return NextResponse.json(withoutLogin(), { status: 401 });
    }

    const userId = parseInt(token.dbUserId as string);

    // Lấy query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '2');
    const statusParam = searchParams.get('status');
    const sort = searchParams.get('sort') || 'addedAt';
    const order = searchParams.get('order') || 'desc';
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Validate status parameter - chỉ chấp nhận các giá trị enum hợp lệ
    const validStatuses: LearningStatus[] = [
      'new',
      'learning',
      'familiar',
      'mastered',
      'forgotten',
    ];
    const status =
      statusParam && validStatuses.includes(statusParam as LearningStatus)
        ? (statusParam as LearningStatus)
        : undefined;

    // Validate sort parameter
    const validSortFields = [
      'addedAt',
      'lastReviewedAt',
      'nextReviewAt',
      'totalReviews',
      'correctCount',
      'currentStreak',
    ];
    const validSort = validSortFields.includes(sort) ? sort : 'addedAt';

    // Xây dựng where condition với type safety
    const where = {
      userId,
      ...(status && { status }),
      ...(search && {
        word: {
          word: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
      }),
    };

    // Lấy danh sách từ vựng với đầy đủ thông tin theo schema
    const userWords = await prisma.userWord.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [validSort]: order.toLowerCase() === 'desc' ? 'desc' : 'asc',
      },
      include: {
        word: {
          select: {
            id: true,
            word: true,
            createdAt: true,
          },
        },
        wordMeaning: {
          select: {
            id: true,
            definition: true,
            vnDefinition: true,
            partOfSpeech: true,
            examples: true,
            cefrLevel: true,
            ukIpa: true,
            usIpa: true,
            ukAudioUrl: true,
            usAudioUrl: true,
          },
        },
      },
    });

    // Đếm tổng số từ vựng
    const total = await prisma.userWord.count({ where });

    // Đếm theo từng status
    const statusCounts = await prisma.userWord.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    // Format lại data để trả về
    const formattedUserWords = userWords.map(userWord => ({
      id: userWord.id,
      status: userWord.status,
      addedAt: userWord.addedAt,
      lastReviewedAt: userWord.lastReviewedAt,
      nextReviewAt: userWord.nextReviewAt,
      totalReviews: userWord.totalReviews,
      correctCount: userWord.correctCount,
      currentStreak: userWord.currentStreak,
      easeFactor: userWord.easeFactor,
      intervalDays: userWord.intervalDays,
      personalNote: userWord.personalNote,
      isFavorite: userWord.isFavorite,

      word: userWord.word.word,
      definition: userWord.wordMeaning.definition,
      vnDefinition: userWord.wordMeaning.vnDefinition,
      partOfSpeech: userWord.wordMeaning.partOfSpeech,
      examples: userWord.wordMeaning.examples,
      cefrLevel: userWord.wordMeaning.cefrLevel,
      ukIpa: userWord.wordMeaning.ukIpa,
      usIpa: userWord.wordMeaning.usIpa,
      ukAudioUrl: userWord.wordMeaning.ukAudioUrl,
      usAudioUrl: userWord.wordMeaning.usAudioUrl,
    }));

    // Format status counts
    const formattedStatusCounts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    console.log(`Successfully fetched ${formattedUserWords.length} words for user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Word list fetched successfully',
      data: {
        words: formattedUserWords,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
        stats: {
          total,
          statusCounts: formattedStatusCounts,
        },
        filters: {
          status: status || null,
          search,
          sort: validSort,
          order,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching word list:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching word list',
        error: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST endpoint giữ nguyên...
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.dbUserId) {
      return NextResponse.json(withoutLogin(), { status: 401 });
    }

    const userId = parseInt(token.dbUserId as string);
    const { action } = await request.json();

    if (action === 'getStats') {
      // Lấy thống kê tổng quan
      const stats = await prisma.userWord.aggregate({
        where: { userId },
        _count: { id: true },
        _avg: {
          correctCount: true,
          totalReviews: true,
          currentStreak: true,
        },
      });

      // Lấy từ cần ôn tập hôm nay
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dueTodayCount = await prisma.userWord.count({
        where: {
          userId,
          nextReviewAt: {
            lte: today,
          },
          status: {
            in: ['new', 'learning', 'familiar'],
          },
        },
      });

      // Lấy từ được thêm hôm nay
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const addedTodayCount = await prisma.userWord.count({
        where: {
          userId,
          addedAt: {
            gte: startOfDay,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Statistics fetched successfully',
        data: {
          totalWords: stats._count.id,
          avgCorrectRate: stats._avg.correctCount || 0,
          avgTotalReviews: stats._avg.totalReviews || 0,
          avgStreak: stats._avg.currentStreak || 0,
          dueTodayCount,
          addedTodayCount,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action',
        error: 'INVALID_ACTION',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in POST wordlist:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
