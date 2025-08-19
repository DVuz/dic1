'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pagination } from './Pagination';
import { UserWord } from '@/app/wordlist/types';
import {
  Volume2,
  Clock,
  CheckCircle,
  BookOpen,
  Star,
  Zap,
  Trophy,
  Target,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface VocabularyGridProps {
  words: UserWord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function VocabularyGrid({
  words,
  pagination,
  isLoading,
  onPageChange,
}: VocabularyGridProps) {
  // Use string type for IDs in the Set
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const playAudio = (audioUrl: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.play().catch(error => console.error('Error playing audio:', error));
  };

  // Fix the type issue by converting ID to string
  const toggleFlip = (wordId: string | number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const idString = String(wordId); // Convert to string to ensure type safety

    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idString)) {
        newSet.delete(idString);
      } else {
        newSet.add(idString);
      }
      return newSet;
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'learning':
        return {
          color:
            'bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-800 border-amber-300/50',
          icon: <Target className="w-3.5 h-3.5" />,
          glow: 'shadow-amber-200/30',
        };
      case 'familiar':
        return {
          color:
            'bg-gradient-to-r from-purple-400/20 to-violet-400/20 text-purple-800 border-purple-300/50',
          icon: <BookOpen className="w-3.5 h-3.5" />,
          glow: 'shadow-purple-200/30',
        };
      case 'mastered':
        return {
          color:
            'bg-gradient-to-r from-emerald-400/20 to-green-400/20 text-emerald-800 border-emerald-300/50',
          icon: <Trophy className="w-3.5 h-3.5" />,
          glow: 'shadow-emerald-200/30',
        };
      case 'forgotten':
        return {
          color:
            'bg-gradient-to-r from-rose-400/20 to-pink-400/20 text-rose-800 border-rose-300/50',
          icon: <Clock className="w-3.5 h-3.5" />,
          glow: 'shadow-rose-200/30',
        };
      default:
        return {
          color:
            'bg-gradient-to-r from-gray-400/20 to-slate-400/20 text-gray-700 border-gray-300/50',
          icon: null,
          glow: 'shadow-gray-200/30',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="group relative h-80 animate-pulse overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br from-white to-gray-50 shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            <div className="h-12 bg-gradient-to-r from-gray-100/80 to-gray-200/80 border-b border-gray-200/50"></div>
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200/60 rounded-full w-16"></div>
                <div className="h-5 bg-gray-200/60 rounded-full w-12"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200/60 rounded w-full"></div>
                <div className="h-4 bg-gray-200/60 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200/60 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .audio-ipa {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .audio-ipa:hover {
          color: #4a6cf7;
          text-decoration: underline;
        }
        @keyframes pulse-soft {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        .pulse-animation {
          animation: pulse-soft 2s infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {words.map((word, index) => {
          const statusConfig = getStatusConfig(word.status);
          // Convert ID to string when checking if it's flipped
          const isFlipped = flippedCards.has(String(word.id));

          return (
            <div
              key={String(word.id)}
              className="group relative h-80 perspective-1000"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* Flashcard container with 3D flip effect */}
              <div
                className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front side - Word and audio buttons */}
                <div className="absolute inset-0 w-full h-full backface-hidden">
                  <div className="relative h-full overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
                    {/* Status glow effect */}
                    <div
                      className={`absolute inset-0 ${statusConfig.glow} opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-xl`}
                    ></div>

                    {/* Favorite star */}
                    {word.isFavorite && (
                      <div className="absolute top-4 right-4 z-10">
                        <Star className="h-6 w-6 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                      </div>
                    )}

                    {/* Main content */}
                    <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                      {/* Word */}
                      <h2 className="text-3xl font-bold text-gray-800 mb-6 leading-tight">
                        {word.word}
                      </h2>

                      {/* Flip button */}
                      <Button
                        onClick={e => toggleFlip(word.id, e)}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>

                      {/* Status indicator */}
                      {word.status && word.status !== 'new' && (
                        <div className="absolute bottom-4 left-4">
                          <Badge className={`px-3 py-1 text-xs font-medium ${statusConfig.color}`}>
                            <span className="flex items-center gap-1">
                              {statusConfig.icon}
                              <span className="capitalize">{word.status}</span>
                            </span>
                          </Badge>
                        </div>
                      )}

                      {/* Streak indicator */}
                      {word.currentStreak > 0 && (
                        <div className="absolute bottom-4 right-4">
                          <Badge className="px-3 py-1 text-xs font-bold bg-green-50 text-green-700 border-green-200/50">
                            <Zap className="h-3.5 w-3.5 mr-1 fill-green-400" />
                            {word.currentStreak}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Back side - Detailed information */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
                  <div className="relative h-full overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br from-white via-slate-50/50 to-gray-50/50 shadow-lg">
                    {/* Header with word and flip button */}
                    <div className="bg-gradient-to-r from-slate-100/80 to-gray-100/80 border-b border-gray-200/50 px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link
                          href={`/words/${word.word}`}
                          className="text-lg font-bold text-gray-800 hover:text-blue-600 truncate transition-colors duration-300"
                          title={word.word}
                        >
                          {word.word}
                        </Link>
                        {word.isFavorite && (
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => toggleFlip(word.id, e)}
                        className="h-8 w-8 p-0 hover:bg-gray-200/60 rounded-full flex-shrink-0"
                        title="Lật lại"
                      >
                        <RotateCcw className="h-4 w-4 text-gray-600" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3 h-[calc(100%-48px)] overflow-y-auto">
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {word.partOfSpeech && (
                          <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-xs font-medium bg-gray-50 border-gray-200/60"
                          >
                            {word.partOfSpeech}
                          </Badge>
                        )}
                        {word.cefrLevel && (
                          <Badge
                            variant="secondary"
                            className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200/50"
                          >
                            {word.cefrLevel}
                          </Badge>
                        )}
                        {word.status && word.status !== 'new' && (
                          <Badge
                            className={`px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                          >
                            <span className="flex items-center gap-0.5">
                              {statusConfig.icon}
                              <span className="capitalize">{word.status}</span>
                            </span>
                          </Badge>
                        )}
                        {word.currentStreak > 0 && (
                          <Badge
                            variant="outline"
                            className="px-2 py-0.5 text-xs font-bold bg-green-50 text-green-700 border-green-200/50"
                          >
                            <Zap className="h-3.5 w-3.5 mr-0.5 fill-green-400" />
                            {word.currentStreak}
                          </Badge>
                        )}
                      </div>

                      {/* IPA Pronunciation with clickable audio */}
                      {(word.ukIpa || word.usIpa) && (
                        <div className="flex flex-wrap gap-2">
                          {word.ukIpa && (
                            <div
                              className="flex items-center audio-ipa bg-blue-50 px-2 py-1 rounded-md border border-blue-100"
                              onClick={e => word.ukAudioUrl && playAudio(word.ukAudioUrl, e)}
                              title="Nhấn để nghe phát âm UK"
                            >
                              <span className="text-xs font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1.5">
                                UK
                              </span>
                              <span className="font-mono text-sm text-blue-700">
                                /{word.ukIpa}/
                              </span>
                              <Volume2 className="h-3 w-3 text-blue-600 ml-1.5 pulse-animation" />
                            </div>
                          )}
                          {word.usIpa && (
                            <div
                              className="flex items-center audio-ipa bg-red-50 px-2 py-1 rounded-md border border-red-100"
                              onClick={e => word.usAudioUrl && playAudio(word.usAudioUrl, e)}
                              title="Nhấn để nghe phát âm US"
                            >
                              <span className="text-xs font-bold bg-red-600 text-white px-1.5 py-0.5 rounded mr-1.5">
                                US
                              </span>
                              <span className="font-mono text-sm text-red-700">/{word.usIpa}/</span>
                              <Volume2 className="h-3 w-3 text-red-600 ml-1.5 pulse-animation" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Definitions */}
                      <div className="space-y-3 mt-2 bg-white p-3 rounded-md border border-gray-100">
                        <div>
                          <p className="text-sm text-gray-900 leading-relaxed">{word.definition}</p>
                        </div>

                        {word.vnDefinition && (
                          <div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {word.vnDefinition}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Personal Note */}
                      {word.personalNote && (
                        <div className="mt-auto">
                          <div className="p-3 bg-yellow-50 border border-yellow-200/60 rounded-lg">
                            <h4 className="text-xs font-semibold text-amber-800 mb-1">
                              Ghi chú cá nhân:
                            </h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                              {word.personalNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
