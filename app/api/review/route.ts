import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, LearningStatus } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import withoutLogin from '@/helper/withouLogin';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    console.log('Received token for review:', token);

    if (!token || !token.dbUserId) {
      return NextResponse.json(withoutLogin(), { status: 401 });
    }

    const userId = parseInt(token.dbUserId as string);

    // Lấy query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const includeNew = searchParams.get('includeNew') !== 'false'; // Mặc định = true
    const maxNewWords = parseInt(searchParams.get('maxNewWords') || '10');
    const prioritizeOverdue = searchParams.get('prioritizeOverdue') !== 'false'; // Mặc định = true
    const debug = searchParams.get('debug') === 'true';

    const currentTime = new Date();

    // DEBUG: Kiểm tra tất cả từ của user
    if (debug) {
      const allUserWords = await prisma.userWord.findMany({
        where: { userId },
        include: {
          word: true,
          wordMeaning: true,
        },
      });

      console.log(`=== DEBUG INFO for user ${userId} ===`);
      console.log(`Total words in database: ${allUserWords.length}`);
      console.log('Current time:', currentTime);
    }

    // Lấy tất cả UserWord của user
    const allUserWords = await prisma.userWord.findMany({
      where: {
        userId,
        status: {
          not: 'mastered', // Không lấy từ đã mastered
        },
      },
      include: {
        word: true,
        wordMeaning: true,
      },
    });

    console.log(`Retrieved ${allUserWords.length} total non-mastered words for user ${userId}`);

    // Phân loại từ thành các nhóm riêng biệt và không chồng chéo
    const wordGroups = {
      // 1. Overdue words (quá hạn >24h)
      overdue: allUserWords.filter(
        word =>
          word.nextReviewAt &&
          word.nextReviewAt < new Date(Date.now() - 24 * 60 * 60 * 1000) &&
          ['learning', 'familiar', 'forgotten'].includes(word.status)
      ),

      // 2. Due words (đến hạn trong 24h gần đây)
      recentlyDue: allUserWords.filter(
        word =>
          word.nextReviewAt &&
          word.nextReviewAt <= currentTime &&
          word.nextReviewAt >= new Date(Date.now() - 24 * 60 * 60 * 1000) &&
          ['learning', 'familiar', 'forgotten'].includes(word.status)
      ),

      // 3. New words (chưa học bao giờ)
      new: allUserWords.filter(word => word.status === 'new' && word.totalReviews === 0),

      // 4. Null nextReviewAt (không phải từ mới)
      nullNextReview: allUserWords.filter(
        word => word.nextReviewAt === null && word.status !== 'new'
      ),

      // 5. Future words (chưa đến hạn)
      future: allUserWords.filter(word => word.nextReviewAt && word.nextReviewAt > currentTime),
    };

    if (debug) {
      console.log('Word groups counts:', {
        overdue: wordGroups.overdue.length,
        recentlyDue: wordGroups.recentlyDue.length,
        new: wordGroups.new.length,
        nullNextReview: wordGroups.nullNextReview.length,
        future: wordGroups.future.length,
      });
    }

    // Xếp hạng ưu tiên theo thứ tự sau:
    // 1. Overdue (forgotten trước, sau đó learning, sau đó familiar)
    // 2. RecentlyDue (forgotten trước, sau đó learning, sau đó familiar)
    // 3. New words (nếu includeNew = true)
    // 4. NullNextReview words (special case)

    // Tạo mảng riêng biệt
    const forgotten = [...wordGroups.overdue, ...wordGroups.recentlyDue]
      .filter(word => word.status === 'forgotten')
      .sort((a, b) => (a.nextReviewAt?.getTime() || 0) - (b.nextReviewAt?.getTime() || 0));

    const learning = [...wordGroups.overdue, ...wordGroups.recentlyDue]
      .filter(word => word.status === 'learning')
      .sort((a, b) => (a.nextReviewAt?.getTime() || 0) - (b.nextReviewAt?.getTime() || 0));

    const familiar = [...wordGroups.overdue, ...wordGroups.recentlyDue]
      .filter(word => word.status === 'familiar')
      .sort((a, b) => (a.nextReviewAt?.getTime() || 0) - (b.nextReviewAt?.getTime() || 0));

    const newWords = wordGroups.new.sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime());

    const nullReviewWords = wordGroups.nullNextReview.sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime()
    );

    // Kết hợp các mảng theo thứ tự ưu tiên
    let prioritizedWords: typeof allUserWords = [];

    // Thêm từ forgotten trước tiên
    prioritizedWords.push(...forgotten);

    // Thêm từ learning
    prioritizedWords.push(...learning);

    // Thêm từ familiar
    prioritizedWords.push(...familiar);

    // Thêm từ mới nếu được phép
    if (includeNew) {
      // Tính số từ mới có thể thêm
      const remainingSlots = Math.max(0, limit - prioritizedWords.length);
      const newWordsToAdd = Math.min(maxNewWords, remainingSlots, newWords.length);

      if (newWordsToAdd > 0) {
        prioritizedWords.push(...newWords.slice(0, newWordsToAdd));
      }
    }

    // Thêm từ nullNextReview nếu còn chỗ
    if (prioritizedWords.length < limit) {
      const remainingSlots = limit - prioritizedWords.length;
      prioritizedWords.push(...nullReviewWords.slice(0, remainingSlots));
    }

    // Giới hạn theo limit
    const finalReviewWords = prioritizedWords.slice(0, limit);

    console.log(`Final review words: ${finalReviewWords.length}`);

    // Tính toán thống kê
    const stats = {
      totalReturned: finalReviewWords.length,
      totalDue: forgotten.length + learning.length + familiar.length,
      totalNew: newWords.length,
      overdue: wordGroups.overdue.length,
      forgotten: forgotten.length,
      learning: learning.length,
      familiar: familiar.length,
      nullNextReview: nullReviewWords.length,

      // Phân loại priority
      highPriority: finalReviewWords.filter(
        w =>
          w.status === 'forgotten' ||
          (w.nextReviewAt && w.nextReviewAt < new Date(Date.now() - 24 * 60 * 60 * 1000))
      ).length,

      mediumPriority: finalReviewWords.filter(
        w =>
          w.status === 'learning' &&
          w.nextReviewAt &&
          w.nextReviewAt <= currentTime &&
          w.nextReviewAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,

      lowPriority: finalReviewWords.filter(
        w => w.status === 'familiar' || w.status === 'new' || w.nextReviewAt === null
      ).length,
    };

    // Format lại data để trả về
    const formattedReviewWords = finalReviewWords.map(userWord => {
      // Xác định priority
      let priority = 'low';

      if (
        userWord.status === 'forgotten' ||
        (userWord.nextReviewAt &&
          userWord.nextReviewAt < new Date(Date.now() - 24 * 60 * 60 * 1000))
      ) {
        priority = 'high';
      } else if (
        userWord.status === 'learning' &&
        userWord.nextReviewAt &&
        userWord.nextReviewAt <= currentTime
      ) {
        priority = 'medium';
      }

      // Tính số ngày quá hạn
      let daysOverdue = 0;
      if (userWord.nextReviewAt && userWord.nextReviewAt < currentTime) {
        daysOverdue = Math.max(
          0,
          Math.floor(
            (currentTime.getTime() - userWord.nextReviewAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }

      return {
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

        // Thông tin từ vựng
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

        // Thông tin bổ sung cho review
        priority,
        isOverdue: userWord.nextReviewAt ? userWord.nextReviewAt < currentTime : false,
        daysOverdue,

        // Thông tin phân loại
        category:
          userWord.status === 'forgotten'
            ? 'forgotten'
            : userWord.status === 'learning'
            ? 'learning'
            : userWord.status === 'familiar'
            ? 'familiar'
            : userWord.status === 'new'
            ? 'new'
            : 'other',
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Review words fetched successfully',
      data: {
        words: formattedReviewWords,
        stats,
        filters: {
          limit,
          includeNew,
          maxNewWords: includeNew ? maxNewWords : 0,
          prioritizeOverdue,
          debug,
        },
        recommendations: {
          suggestedSessionSize: Math.min(
            Math.max(stats.totalDue + (includeNew ? Math.min(stats.totalNew, maxNewWords) : 0), 5),
            30
          ),
          shouldIncludeNew: stats.totalDue < 15 && stats.totalNew > 0,
          urgencyLevel: stats.overdue > 10 ? 'high' : stats.overdue > 5 ? 'medium' : 'low',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching review words:', error);
    console.error('Error details:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching review words',
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST endpoint để cập nhật kết quả review
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.dbUserId) {
      return NextResponse.json(withoutLogin(), { status: 401 });
    }

    const userId = parseInt(token.dbUserId as string);
    const { action, wordId, isCorrect, responseTimeMs } = await request.json();

    if (action === 'updateReview') {
      // Tìm user word
      const userWord = await prisma.userWord.findFirst({
        where: {
          userId,
          id: wordId,
        },
      });

      if (!userWord) {
        return NextResponse.json(
          {
            success: false,
            message: 'Word not found',
            error: 'WORD_NOT_FOUND',
          },
          { status: 404 }
        );
      }

      // Tính toán SRS (Spaced Repetition System)
      const calculateNextReview = (
        currentEaseFactor: number,
        currentInterval: number,
        isCorrect: boolean,
        currentStreak: number
      ) => {
        let newEaseFactor = currentEaseFactor;
        let newInterval = currentInterval;
        let newStreak = currentStreak;
        let newStatus: LearningStatus = userWord.status;

        if (isCorrect) {
          newStreak += 1;

          if (newStreak === 1) {
            newInterval = 1;
          } else if (newStreak === 2) {
            newInterval = 6;
          } else {
            newInterval = Math.round(currentInterval * newEaseFactor);
          }

          // Cập nhật status dựa trên streak
          if (newStreak >= 8) {
            newStatus = 'mastered';
          } else if (newStreak >= 4) {
            newStatus = 'familiar';
          } else if (newStreak >= 1) {
            newStatus = 'learning';
          }
        } else {
          // Sai -> reset streak và giảm ease factor
          newStreak = 0;
          newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
          newInterval = 1;
          newStatus = 'forgotten';
        }

        const nextReviewAt = new Date();
        nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

        return {
          newEaseFactor,
          newInterval,
          newStreak,
          newStatus,
          nextReviewAt,
        };
      };

      const { newEaseFactor, newInterval, newStreak, newStatus, nextReviewAt } =
        calculateNextReview(
          parseFloat(userWord.easeFactor.toString()),
          userWord.intervalDays,
          isCorrect,
          userWord.currentStreak
        );

      // Cập nhật user word
      const updatedUserWord = await prisma.userWord.update({
        where: { id: wordId },
        data: {
          lastReviewedAt: new Date(),
          nextReviewAt,
          totalReviews: { increment: 1 },
          correctCount: isCorrect ? { increment: 1 } : undefined,
          currentStreak: newStreak,
          easeFactor: newEaseFactor,
          intervalDays: newInterval,
          status: newStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Review updated successfully',
        data: {
          updatedWord: updatedUserWord,
          reviewResult: {
            isCorrect,
            newStatus,
            nextReviewIn: newInterval,
            streakCount: newStreak,
            easeFactor: newEaseFactor,
          },
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
    console.error('Error in POST review:', error);
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
