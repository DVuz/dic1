import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import withoutLogin from '@/helper/withouLogin';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Xác thực người dùng
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.dbUserId) {
      return NextResponse.json(withoutLogin(), { status: 401 });
    }

    const userId = parseInt(token.dbUserId as string);

    // Lấy parameters từ URL
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // Mặc định 7 ngày
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]; // Mặc định hôm nay

    // Tính toán khoảng thời gian dựa trên period hoặc startDate
    let queryStartDate = new Date();
    if (startDate) {
      queryStartDate = new Date(startDate);
    } else {
      // Xử lý period: 1d, 7d, 30d, 90d, all
      const days =
        period === 'all'
          ? 365 * 10 // Giả sử "all" là 10 năm
          : parseInt(period.replace('d', ''));

      queryStartDate.setDate(queryStartDate.getDate() - days);
    }

    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999); // Đến cuối ngày

    // Lấy tất cả các từ được review trong khoảng thời gian
    const reviewedWords = await prisma.userWord.findMany({
      where: {
        userId,
        lastReviewedAt: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      include: {
        word: true,
        wordMeaning: true,
      },
      orderBy: {
        lastReviewedAt: 'desc',
      },
    });

    // Tạo map để lưu trữ kết quả theo ngày
    const dailyReviews: Record<
      string,
      {
        date: string;
        totalReviews: number;
        correctAnswers: number;
        incorrectAnswers: number;
        accuracy: number;
        wordsByStatus: Record<string, number>;
        words: Array<{
          id: number;
          word: string;
          definition: string;
          status: string;
          currentStreak: number;
          correctCount: number;
          totalReviews: number;
          lastReviewedAt: string;
        }>;
      }
    > = {};

    // Xử lý dữ liệu và nhóm theo ngày
    reviewedWords.forEach(userWord => {
      if (!userWord.lastReviewedAt) return;

      const reviewDate = userWord.lastReviewedAt.toISOString().split('T')[0]; // Format YYYY-MM-DD

      if (!dailyReviews[reviewDate]) {
        dailyReviews[reviewDate] = {
          date: reviewDate,
          totalReviews: 0,
          correctAnswers: 0,
          incorrectAnswers: 0,
          accuracy: 0,
          wordsByStatus: {},
          words: [],
        };
      }

      // Tăng tổng số từ được review
      dailyReviews[reviewDate].totalReviews++;

      // Đếm từ theo trạng thái
      const status = userWord.status;
      dailyReviews[reviewDate].wordsByStatus[status] =
        (dailyReviews[reviewDate].wordsByStatus[status] || 0) + 1;

      // Xác định đúng/sai dựa trên streak và totalReviews
      // Nếu có streak, giả định lần review gần nhất là đúng
      // Nếu streak = 0 và đã review ít nhất 1 lần, giả định lần review gần nhất là sai
      if (userWord.currentStreak > 0) {
        dailyReviews[reviewDate].correctAnswers++;
      } else if (userWord.totalReviews > 0) {
        dailyReviews[reviewDate].incorrectAnswers++;
      }

      // Thêm thông tin từ vào danh sách
      dailyReviews[reviewDate].words.push({
        id: userWord.id,
        word: userWord.word.word,
        definition: userWord.wordMeaning.definition,
        status: userWord.status,
        currentStreak: userWord.currentStreak,
        correctCount: userWord.correctCount,
        totalReviews: userWord.totalReviews,
        lastReviewedAt: userWord.lastReviewedAt.toISOString(),
      });
    });

    // Tính tỷ lệ chính xác và sắp xếp kết quả
    const results = Object.values(dailyReviews)
      .map(day => {
        const total = day.correctAnswers + day.incorrectAnswers;
        day.accuracy = total > 0 ? Math.round((day.correctAnswers / total) * 100) : 0;
        return day;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Tính tổng cộng cho toàn bộ khoảng thời gian
    const summary = {
      period: period !== 'custom' ? period : `${startDate} to ${endDate}`,
      totalDays: results.length,
      totalReviews: results.reduce((sum, day) => sum + day.totalReviews, 0),
      totalCorrect: results.reduce((sum, day) => sum + day.correctAnswers, 0),
      totalIncorrect: results.reduce((sum, day) => sum + day.incorrectAnswers, 0),
      overallAccuracy: 0,
      wordsByStatus: {} as Record<string, number>,
      averageWordsPerDay: 0,
      bestDay:
        results.length > 0
          ? results.reduce(
              (best, day) => (day.totalReviews > best.totalReviews ? day : best),
              results[0]
            ).date
          : null,
      streakInfo: {
        currentStreak: 0,
        longestStreak: 0,
        totalActiveDays: results.length,
      },
    };

    // Tính tỷ lệ chính xác tổng thể
    const totalAnswered = summary.totalCorrect + summary.totalIncorrect;
    summary.overallAccuracy =
      totalAnswered > 0 ? Math.round((summary.totalCorrect / totalAnswered) * 100) : 0;

    // Tính số từ trung bình mỗi ngày
    const daysDiff = Math.max(
      1,
      Math.round((queryEndDate.getTime() - queryStartDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    summary.averageWordsPerDay = Math.round((summary.totalReviews / daysDiff) * 10) / 10;

    // Tính từ theo trạng thái
    results.forEach(day => {
      Object.entries(day.wordsByStatus).forEach(([status, count]) => {
        summary.wordsByStatus[status] = (summary.wordsByStatus[status] || 0) + count;
      });
    });

    // Phân tích thông tin streak (ngày học liên tiếp)
    if (results.length > 0) {
      let currentStreak = 0;
      let longestStreak = 0;
      let previousDate: Date | null = null;

      // Sắp xếp theo ngày gần nhất -> xa nhất
      const sortedDates = results
        .map(r => new Date(r.date))
        .sort((a, b) => b.getTime() - a.getTime());

      // Kiểm tra ngày hôm nay
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const mostRecentDate = sortedDates[0];
      const isActiveToday =
        mostRecentDate &&
        mostRecentDate.getFullYear() === today.getFullYear() &&
        mostRecentDate.getMonth() === today.getMonth() &&
        mostRecentDate.getDate() === today.getDate();

      // Nếu đã học hôm nay, bắt đầu streak
      if (isActiveToday) {
        currentStreak = 1;
        previousDate = today;

        // Duyệt qua các ngày còn lại
        for (let i = 1; i < sortedDates.length; i++) {
          const currentDate = sortedDates[i];

          // Nếu ngày này là liền kề với ngày trước đó
          if (previousDate && daysBetween(currentDate, previousDate) === 1) {
            currentStreak++;
            previousDate = currentDate;
          } else {
            break; // Streak bị ngắt
          }
        }
      }

      // Tìm streak dài nhất
      let tempStreak = 1;
      previousDate = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];

        if (previousDate && daysBetween(currentDate, previousDate) === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }

        previousDate = currentDate;
      }

      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      summary.streakInfo = {
        currentStreak,
        longestStreak,
        totalActiveDays: results.length,
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Review history retrieved successfully',
      data: {
        summary,
        dailyStats: results,
      },
    });
  } catch (error) {
    console.error('Error fetching review history:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching review history',
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to calculate days between two dates
function daysBetween(date1: Date, date2: Date): number {
  // Normalize dates to start of day
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);

  // Calculate difference
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
