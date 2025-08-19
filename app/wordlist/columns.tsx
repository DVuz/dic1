'use client';

import { ColumnDef } from '@tanstack/react-table';
import { UserWord } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Volume2, Info, BookOpen, Check, Star } from 'lucide-react';

// Function để play audio
const playAudio = (url: string) => {
  if (url) {
    const audio = new Audio(url);
    audio.play().catch(console.error);
  }
};

// Colors for part of speech
const partOfSpeechColors: Record<string, string> = {
  noun: 'bg-blue-100 text-blue-800 border-blue-200',
  verb: 'bg-green-100 text-green-800 border-green-200',
  adjective: 'bg-purple-100 text-purple-800 border-purple-200',
  adverb: 'bg-orange-100 text-orange-800 border-orange-200',
  pronoun: 'bg-pink-100 text-pink-800 border-pink-200',
  preposition: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  conjunction: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  interjection: 'bg-red-100 text-red-800 border-red-200',
  determiner: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  article: 'bg-teal-100 text-teal-800 border-teal-200',
  modal: 'bg-violet-100 text-violet-800 border-violet-200',
  auxiliary: 'bg-rose-100 text-rose-800 border-rose-200',
  particle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Colors for CEFR levels
const cefrColors: Record<string, string> = {
  A1: 'bg-green-100 text-green-800 border-green-200',
  A2: 'bg-lime-100 text-lime-800 border-lime-200',
  B1: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  B2: 'bg-orange-100 text-orange-800 border-orange-200',
  C1: 'bg-red-100 text-red-800 border-red-200',
  C2: 'bg-purple-100 text-purple-800 border-purple-200',
  default: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Cấu hình cột
export const columns: ColumnDef<UserWord>[] = [
  // Cột Word - Removed CEFR level badge
  {
    accessorKey: 'word',
    header: () => <div className="text-left">Word</div>,
    cell: ({ row }) => {
      const word = row.original;

      return (
        <div className="py-3 px-2">
          <div className="flex items-center gap-2">
            <span className="font-medium ">{word.word}</span>
          </div>
        </div>
      );
    },
  },

  // Cột Type (Part of Speech)
  {
    accessorKey: 'partOfSpeech',
    header: () => <div className="text-left">Type</div>,
    cell: ({ row }) => {
      const word = row.original;
      const posColor =
        partOfSpeechColors[word.partOfSpeech?.toLowerCase()] || partOfSpeechColors.default;

      return (
        <div className="py-3 px-2">
          <Badge className={`text-xs px-1.5 py-0 h-5 ${posColor}`}>{word.partOfSpeech}</Badge>
        </div>
      );
    },
  },

  // Cột Pronunciation
  {
    id: 'pronunciation',
    header: () => <div className="text-left">Pronunciation</div>,
    cell: ({ row }) => {
      const word = row.original;

      return (
        <div className="py-3 px-2">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-gray-600 font-mono cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <span
                      className="mr-2 hover:text-blue-600"
                      onClick={() => playAudio(word.ukAudioUrl)}
                    >
                      /{word.ukIpa}/
                    </span>
                    <span className="hover:text-red-600" onClick={() => playAudio(word.usAudioUrl)}>
                      /{word.usIpa}/
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                    <span className="text-gray-500">UK:</span>
                    <span>/{word.ukIpa}/</span>
                    <span className="text-gray-500">US:</span>
                    <span>/{word.usIpa}/</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    },
  },

  // Cột Meaning - Added CEFR level badge
  {
    id: 'meaning',
    header: () => <div className="text-left">Meaning</div>,
    cell: ({ row }) => {
      const word = row.original;
      const cefrColor = cefrColors[word.cefrLevel] || cefrColors.default;

      return (
        <div className="py-3 px-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`text-xs px-1.5 py-0 h-5 ${cefrColor}`}>{word.cefrLevel}</Badge>
            <div className="line-clamp-1 text-sm">{word.definition || word.vnDefinition}</div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
          <div className="space-y-2">
            {word.vnDefinition && (
              <div className="text-sm font-medium">{word.vnDefinition}</div>
            )}
            <div className="text-xs text-gray-600">{word.definition}</div>
          </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },

  // Cột Example
  {
    id: 'example',
    header: () => <div className="text-left">Example</div>,
    cell: ({ row }) => {
      const word = row.original;
      const examples = word.examples || [];

      if (!examples.length)
        return (
          <div className="py-3 px-2">
            <span className="text-gray-400 text-xs">No examples</span>
          </div>
        );

      return (
        <div className="py-3 px-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="line-clamp-1 text-xs text-gray-700 cursor-help">
                  "{examples[0]}"
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-md">
                <div className="space-y-2">
                  <div className="font-medium text-sm">All Examples:</div>
                  <ul className="space-y-1 text-xs">
                    {examples.map((example, i) => (
                      <li key={i} className="border-l-2 border-blue-200 pl-2">
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },

  // Cột Status
  {
    accessorKey: 'status',
    header: () => <div className="text-left">Status</div>,
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const word = row.original;

      const statusColors: Record<string, string> = {
        new: 'bg-blue-100 text-blue-800 border-blue-300',
        learning: 'bg-amber-100 text-amber-800 border-amber-300',
        familiar: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        mastered: 'bg-purple-100 text-purple-800 border-purple-300',
        forgotten: 'bg-red-100 text-red-800 border-red-300',
      };

      const accuracyRate =
        word.totalReviews > 0 ? Math.round((word.correctCount / word.totalReviews) * 100) : 0;

      // Status icons
      const statusIcons = {
        new: <span className="mr-1 text-blue-500">🆕</span>,
        learning: <span className="mr-1 text-amber-500">📚</span>,
        familiar: <span className="mr-1 text-emerald-500">✨</span>,
        mastered: <span className="mr-1 text-purple-500">🏆</span>,
        forgotten: <span className="mr-1 text-red-500">❌</span>,
      };

      const icon = statusIcons[status as keyof typeof statusIcons];

      return (
        <div className="py-3 px-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center cursor-help">
                  <Badge
                    className={`${
                      statusColors[status] || statusColors.new
                    } shadow-sm px-1.5 py-0.5 h-5`}
                  >
                    {icon}
                    <span className="text-xs">{status.toUpperCase()}</span>
                  </Badge>
                  {word.totalReviews > 0 && (
                    <div className="flex items-center ml-2 text-xs text-gray-500">
                      <Check className="h-3 w-3 mr-0.5 text-green-500" />
                      {accuracyRate}%
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="w-64 p-4">
                <div className="space-y-3">
                  <div className="text-sm font-semibold border-b border-gray-200 pb-2">
                    📊 Learning Progress
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-gray-500">📝 Reviews:</div>
                    <div className="font-medium">{word.totalReviews}</div>

                    <div className="text-gray-500">✅ Correct:</div>
                    <div className="font-medium text-green-600">{word.correctCount}</div>

                    <div className="text-gray-500">📈 Accuracy:</div>
                    <div className="font-medium">{accuracyRate}%</div>

                    <div className="text-gray-500">🔥 Streak:</div>
                    <div className="font-medium text-orange-600">{word.currentStreak}</div>
                  </div>

                  <div className="border-t border-gray-200 pt-2 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">📅 Next review:</span>
                      <span className="font-medium">
                        {word.nextReviewAt
                          ? new Date(word.nextReviewAt).toLocaleDateString('vi-VN')
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">➕ Added:</span>
                      <span className="font-medium">
                        {new Date(word.addedAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
];
