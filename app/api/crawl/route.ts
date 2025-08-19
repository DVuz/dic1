import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CambridgeWord {
  word: string;
  meanings: Array<{
    id?: number; // Thêm id của WordMeaning
    audio: {
      us: string;
      uk: string;
    };
    ipa: {
      us: string;
      uk: string;
    };
    partOfSpeech: string;
    definition: string;
    cefr_level: string;
    examples: string[];
    vnDefinition?: string; // Thêm để hỗ trợ dữ liệu từ database
  }>;
  translation: string;
}

interface ApiResponse extends CambridgeWord {
  source: 'database' | 'crawl';
  wordId?: number; // Thêm id của Word
}

// Function để clean và validate data
function cleanDefinition(definition: string): string {
  return definition
    .replace(/→\s*/g, '') // Remove arrow symbols
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^\s*[\-\•\→\►]\s*/g, '') // Remove leading bullet points/arrows
    .replace(/^\s*\d+\.\s*/g, '') // Remove leading numbers like "1. "
    .replace(/\s*\|\s*/g, ' ') // Replace pipes with spaces
    .trim();
}

function isValidDefinition(definition: string): boolean {
  const cleaned = cleanDefinition(definition);

  // Check minimum length
  if (cleaned.length < 10) return false;

  // Check if it's just whitespace, numbers, or symbols
  if (!/[a-zA-Z]/.test(cleaned)) return false;

  // Check for common invalid patterns
  const invalidPatterns = [
    /^memory address$/i,
    /^→\s*$/,
    /^\s*\n\s*$/,
    /^[\s\n\r\t]*$/,
    /^[\d\s\-\•\→\►]*$/,
    /^see also/i,
    /^compare/i,
    /^opposite/i,
    /^related/i,
    /^idioms?:/i,
    /^phrasal verbs?:/i,
  ];

  return !invalidPatterns.some(pattern => pattern.test(cleaned));
}

function cleanPartOfSpeech(pos: string): string {
  const cleaned = pos
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim()
    .toLowerCase();

  // Chuẩn hóa các từ loại về dạng đầy đủ
  const posMap: Record<string, string> = {
    n: 'noun',
    v: 'verb',
    adj: 'adjective',
    adv: 'adverb',
    prep: 'preposition',
    conj: 'conjunction',
    pron: 'pronoun',
    interj: 'interjection',
    det: 'determiner',
    art: 'article',
  };

  return posMap[cleaned] || cleaned;
}

function cleanExample(example: string): string {
  return example
    .replace(/^\s*[\-\•\→\►]\s*/g, '') // Remove leading bullets
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidExample(example: string): boolean {
  const cleaned = cleanExample(example);
  return cleaned.length >= 5 && /[a-zA-Z]/.test(cleaned);
}

// Function để lấy từ database
async function getWordFromDatabase(
  word: string
): Promise<(CambridgeWord & { wordId: number }) | null> {
  try {
    const wordData = await prisma.word.findUnique({
      where: { word: word.toLowerCase() },
      include: {
        meanings: true,
      },
    });

    if (!wordData || wordData.meanings.length === 0) {
      return null;
    }

    // Convert database format to API format với id
    const meanings = wordData.meanings.map(meaning => ({
      id: meaning.id, // Include WordMeaning ID
      audio: {
        us: meaning.usAudioUrl || '',
        uk: meaning.ukAudioUrl || '',
      },
      ipa: {
        us: meaning.usIpa || '',
        uk: meaning.ukIpa || '',
      },
      partOfSpeech: meaning.partOfSpeech || '',
      definition: meaning.definition,
      vnDefinition: meaning.vnDefinition || '', // Include Vietnamese definition
      cefr_level: meaning.cefrLevel || '',
      examples: Array.isArray(meaning.examples) ? (meaning.examples as string[]) : [],
    }));

    // Sắp xếp meanings theo từ loại
    const sortedMeanings = sortMeaningsByPartOfSpeech(meanings);

    // Get translation from first meaning's vnDefinition
    const translation = wordData.meanings[0]?.vnDefinition || '';

    return {
      word: wordData.word,
      meanings: sortedMeanings,
      translation,
      wordId: wordData.id, // Include Word ID
    };
  } catch (error) {
    console.error('Database query error:', error);
    return null;
  }
}

// Function để lưu từ vào database với data cleaning
async function saveWordToDatabase(
  wordData: CambridgeWord
): Promise<(CambridgeWord & { wordId: number }) | null> {
  try {
    // Filter out invalid meanings before saving
    const validMeanings = wordData.meanings.filter(meaning =>
      isValidDefinition(meaning.definition)
    );

    if (validMeanings.length === 0) {
      console.log(`⚠️ No valid meanings found for word "${wordData.word}", skipping save`);
      return null;
    }

    // Tạo word entry
    const word = await prisma.word.create({
      data: {
        word: wordData.word.toLowerCase(),
      },
    });

    // Tạo meanings với cleaned data (không điền vnDefinition)
    const createdMeanings = await Promise.all(
      validMeanings.map(meaning =>
        prisma.wordMeaning.create({
          data: {
            wordId: word.id,
            definition: cleanDefinition(meaning.definition),
            vnDefinition: '', // Để trống, sẽ điền sau
            partOfSpeech: cleanPartOfSpeech(meaning.partOfSpeech),
            examples: meaning.examples.filter(isValidExample).map(cleanExample),
            cefrLevel: meaning.cefr_level.trim(),
            ukIpa: meaning.ipa.uk,
            usIpa: meaning.ipa.us,
            ukAudioUrl: meaning.audio.uk,
            usAudioUrl: meaning.audio.us,
          },
        })
      )
    );

    console.log(
      `✅ Saved word "${wordData.word}" to database with ${createdMeanings.length} valid meanings`
    );

    // Return data với IDs được tạo
    const meaningsWithIds = createdMeanings.map((createdMeaning, index) => ({
      id: createdMeaning.id, // WordMeaning ID
      audio: validMeanings[index].audio,
      ipa: validMeanings[index].ipa,
      partOfSpeech: validMeanings[index].partOfSpeech,
      definition: validMeanings[index].definition,
      cefr_level: validMeanings[index].cefr_level,
      examples: validMeanings[index].examples,
    }));

    // Sắp xếp meanings theo từ loại
    const sortedMeanings = sortMeaningsByPartOfSpeech(meaningsWithIds);

    return {
      word: wordData.word,
      meanings: sortedMeanings,
      translation: wordData.translation,
      wordId: word.id, // Word ID
    };
  } catch (error) {
    console.error('Database save error:', error);
    return null;
  }
}

// Helper function để normalize definition cho việc so sánh
function normalizeDefinition(def: string): string {
  return cleanDefinition(def)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function để check định nghĩa có trùng lặp không
function isDefinitionSimilar(def1: string, def2: string): boolean {
  const norm1 = normalizeDefinition(def1);
  const norm2 = normalizeDefinition(def2);

  // Nếu giống hệt nhau
  if (norm1 === norm2) return true;

  // Nếu một cái chứa cái kia (và độ dài chênh lệch không quá 30%)
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;

  if (longer.includes(shorter) && shorter.length / longer.length > 0.7) {
    return true;
  }

  // Check similarity bằng từ khóa chung
  const words1 = norm1.split(' ').filter(w => w.length > 3);
  const words2 = norm2.split(' ').filter(w => w.length > 3);

  if (words1.length > 3 && words2.length > 3) {
    const commonWords = words1.filter(w => words2.includes(w));
    const similarity = commonWords.length / Math.min(words1.length, words2.length);
    if (similarity > 0.6) return true;
  }

  return false;
}

// Function mới để sắp xếp meanings theo thứ tự từ loại
function sortMeaningsByPartOfSpeech(meanings: any[]): any[] {
  // Thứ tự ưu tiên của các từ loại
  const posOrder = [
    'noun',
    'verb',
    'adjective',
    'adverb',
    'preposition',
    'conjunction',
    'pronoun',
    'determiner',
    'article',
    'interjection',
  ];

  // Nhóm các meanings theo từ loại
  const meaningsByPos: Record<string, any[]> = {};

  meanings.forEach(meaning => {
    const pos = meaning.partOfSpeech || 'unknown';
    if (!meaningsByPos[pos]) {
      meaningsByPos[pos] = [];
    }
    meaningsByPos[pos].push(meaning);
  });

  // Tạo mảng đã sắp xếp
  const sortedMeanings: any[] = [];

  // Thêm các từ loại theo thứ tự ưu tiên
  posOrder.forEach(pos => {
    if (meaningsByPos[pos]) {
      sortedMeanings.push(...meaningsByPos[pos]);
      delete meaningsByPos[pos];
    }
  });

  // Thêm các từ loại còn lại
  Object.values(meaningsByPos).forEach(posGroup => {
    sortedMeanings.push(...posGroup);
  });

  return sortedMeanings;
}

// Hàm giúp chuẩn hóa URL audio
function getFullAudioUrl(src: string | undefined): string {
  if (!src) return '';

  return src.startsWith('http') ? src : `https://dictionary.cambridge.org${src}`;
}

export async function crawlCambridgeWord(word: string): Promise<CambridgeWord | null> {
  try {
    const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(
      word.trim()
    )}`;

    console.log(`🔍 Crawling Cambridge: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Check if word exists
    const hasContent =
      $('.pr.dictionary, .entry-body, .di-title, .entry, .pr.entry-body__el').length > 0;
    if (!hasContent) {
      console.log(`❌ Word "${word}" not found in Cambridge`);
      return null;
    }

    // Cấu trúc để lưu trữ các nghĩa theo từng loại từ
    const meaningsByPos: Record<
      string,
      Array<{
        audio: { us: string; uk: string };
        ipa: { us: string; uk: string };
        partOfSpeech: string;
        definition: string;
        cefr_level: string;
        examples: string[];
      }>
    > = {};

    // Set để track definitions đã thêm (tránh trùng lặp)
    const addedDefinitions = new Set<string>();

    // PHASE 1: Thu thập dữ liệu từ các entry-body__el - đây là cấu trúc chính của Cambridge Dictionary
    console.log('📚 Extracting entries by part of speech...');

    $('.pr.entry-body__el').each((entryIndex, entry) => {
      const $entry = $(entry);

      // Lấy part of speech cho entry này
      const rawPartOfSpeech = $entry.find('.pos, .dpos, .posgram .pos').first().text().trim();
      const partOfSpeech = cleanPartOfSpeech(rawPartOfSpeech);

      if (!partOfSpeech) {
        console.log(`⚠️ Skipping entry ${entryIndex + 1}: No part of speech found`);
        return; // Skip this entry if no part of speech
      }

      console.log(`📝 Processing entry ${entryIndex + 1}: ${partOfSpeech}`);

      // Lấy phát âm cho entry này
      const ukIpa = $entry.find('.uk .pron .ipa, .uk.dpron .ipa').first().text().trim();
      const usIpa = $entry.find('.us .pron .ipa, .us.dpron .ipa').first().text().trim();

      // Lấy audio URLs
      const ukAudioSrc = $entry
        .find('.uk .daud audio source[type="audio/mpeg"], .uk.dpron audio source')
        .first()
        .attr('src');
      const usAudioSrc = $entry
        .find('.us .daud audio source[type="audio/mpeg"], .us.dpron audio source')
        .first()
        .attr('src');

      const ukAudio = getFullAudioUrl(ukAudioSrc);
      const usAudio = getFullAudioUrl(usAudioSrc);

      // Khởi tạo mảng cho từ loại này nếu chưa có
      if (!meaningsByPos[partOfSpeech]) {
        meaningsByPos[partOfSpeech] = [];
      }

      // Lấy tất cả các nghĩa cho từ loại này
      $entry.find('.def-block, .ddef_block, .sense-block').each((_, senseBlock) => {
        const $senseBlock = $(senseBlock);

        // Lấy CEFR level nếu có
        const cefrLevel = $senseBlock.find('.epp-xref, .def-info .epp-xref').first().text().trim();

        // Lấy definition
        const $def = $senseBlock.find('.def, .ddef_d').first();
        const rawDefinition = $def.text().trim();

        if (rawDefinition && isValidDefinition(rawDefinition)) {
          const cleanedDef = cleanDefinition(rawDefinition);

          // Check xem đã thêm definition này chưa
          let isDuplicate = false;
          for (const existingDef of addedDefinitions) {
            if (isDefinitionSimilar(cleanedDef, existingDef)) {
              isDuplicate = true;
              break;
            }
          }

          if (!isDuplicate) {
            addedDefinitions.add(cleanedDef);

            // Lấy examples
            const examples: string[] = [];
            $senseBlock.find('.examp .eg, .dexamp .deg, .eg').each((_, exampleEl) => {
              const rawExample = $(exampleEl).text().trim();
              if (isValidExample(rawExample)) {
                const cleanedExample = cleanExample(rawExample);
                if (!examples.includes(cleanedExample)) {
                  examples.push(cleanedExample);
                }
              }
            });

            // Giới hạn số lượng ví dụ
            const limitedExamples = examples.slice(0, 3);

            // Thêm nghĩa mới vào mảng theo từ loại
            meaningsByPos[partOfSpeech].push({
              audio: { us: usAudio, uk: ukAudio },
              ipa: { us: usIpa, uk: ukIpa },
              partOfSpeech,
              definition: cleanedDef,
              cefr_level: cefrLevel,
              examples: limitedExamples,
            });

            console.log(`  ✓ Added meaning for ${partOfSpeech}: ${cleanedDef.substring(0, 40)}...`);
          }
        }
      });
    });

    // PHASE 2: Nếu không tìm thấy đủ nghĩa, thử với cấu trúc trang khác
    const totalMeanings = Object.values(meaningsByPos).reduce((sum, arr) => sum + arr.length, 0);

    if (totalMeanings < 5) {
      console.log('📖 Trying alternative page structure...');

      // Tìm global pronunciations để sử dụng khi cần
      const globalUkIpa = $('.uk .pron .ipa').first().text().trim();
      const globalUsIpa = $('.us .pron .ipa').first().text().trim() || globalUkIpa;
      const globalUkAudio = getFullAudioUrl(
        $('.uk .daud audio source[type="audio/mpeg"]').first().attr('src')
      );
      const globalUsAudio = getFullAudioUrl(
        $('.us .daud audio source[type="audio/mpeg"]').first().attr('src')
      );

      // Tìm các blocks theo cấu trúc khác
      $('.pos-body, .pv-body, .idiom-body, .dpos-h').each((_, posBlock) => {
        const $posBlock = $(posBlock);

        // Tìm part of speech
        const rawPos = $posBlock.prevAll('.pos-header, .pos, .dpos-h').first().text().trim();
        let partOfSpeech = cleanPartOfSpeech(rawPos);

        // Nếu không tìm thấy, thử tìm trong thẻ cha
        if (!partOfSpeech) {
          const parentPos = $posBlock
            .closest('.entry-body__el, .entry, .di-body')
            .find('.pos, .dpos')
            .first()
            .text()
            .trim();
          partOfSpeech = cleanPartOfSpeech(parentPos) || 'unknown';
        }

        // Khởi tạo mảng cho từ loại này nếu chưa có
        if (!meaningsByPos[partOfSpeech]) {
          meaningsByPos[partOfSpeech] = [];
        }

        // Lấy phát âm từ block này hoặc sử dụng global
        const blockUkIpa = $posBlock.find('.uk .pron .ipa').first().text().trim() || globalUkIpa;
        const blockUsIpa = $posBlock.find('.us .pron .ipa').first().text().trim() || globalUsIpa;
        const blockUkAudio =
          getFullAudioUrl($posBlock.find('.uk .daud audio source').first().attr('src')) ||
          globalUkAudio;
        const blockUsAudio =
          getFullAudioUrl($posBlock.find('.us .daud audio source').first().attr('src')) ||
          globalUsAudio;

        // Xử lý các definitions trong block này
        $posBlock.find('.def, .ddef_d').each((_, defEl) => {
          const rawDefinition = $(defEl).text().trim();

          if (rawDefinition && isValidDefinition(rawDefinition)) {
            const cleanedDef = cleanDefinition(rawDefinition);

            // Check xem đã thêm definition này chưa
            let isDuplicate = false;
            for (const existingDef of addedDefinitions) {
              if (isDefinitionSimilar(cleanedDef, existingDef)) {
                isDuplicate = true;
                break;
              }
            }

            if (!isDuplicate) {
              addedDefinitions.add(cleanedDef);

              // Lấy CEFR level
              const $defParent = $(defEl).closest('.def-block, .ddef_block');
              const cefrLevel = $defParent.find('.epp-xref').first().text().trim();

              // Lấy examples
              const examples: string[] = [];
              $defParent.find('.examp .eg, .dexamp .deg, .eg').each((_, exampleEl) => {
                const rawExample = $(exampleEl).text().trim();
                if (isValidExample(rawExample)) {
                  const cleanedExample = cleanExample(rawExample);
                  if (!examples.includes(cleanedExample)) {
                    examples.push(cleanedExample);
                  }
                }
              });

              // Giới hạn số lượng ví dụ
              const limitedExamples = examples.slice(0, 2);

              // Thêm nghĩa mới vào mảng theo từ loại
              meaningsByPos[partOfSpeech].push({
                audio: { us: blockUsAudio, uk: blockUkAudio },
                ipa: { us: blockUsIpa, uk: blockUkIpa },
                partOfSpeech,
                definition: cleanedDef,
                cefr_level: cefrLevel,
                examples: limitedExamples,
              });
            }
          }
        });
      });
    }

    // Kiểm tra xem có bất kỳ nghĩa nào không
    const updatedTotalMeanings = Object.values(meaningsByPos).reduce(
      (sum, arr) => sum + arr.length,
      0
    );

    if (updatedTotalMeanings === 0) {
      console.log(`❌ No valid meanings found for word "${word}"`);
      return null;
    }

    // Kết hợp tất cả các nghĩa và sắp xếp theo thứ tự từ loại
    const allMeanings: any[] = [];

    // Trước tiên, thêm các từ loại phổ biến theo thứ tự ưu tiên
    const posOrder = [
      'noun',
      'verb',
      'adjective',
      'adverb',
      'preposition',
      'conjunction',
      'pronoun',
    ];

    posOrder.forEach(pos => {
      if (meaningsByPos[pos] && meaningsByPos[pos].length > 0) {
        allMeanings.push(...meaningsByPos[pos]);
        delete meaningsByPos[pos];
      }
    });

    // Sau đó thêm các từ loại khác
    Object.values(meaningsByPos).forEach(meanings => {
      if (meanings.length > 0) {
        allMeanings.push(...meanings);
      }
    });

    // Giới hạn tổng số nghĩa là 15
    const finalMeanings = allMeanings.slice(0, 15);

    // In thông tin về từ loại đã thu thập được
    const posCount: Record<string, number> = {};
    finalMeanings.forEach(meaning => {
      const pos = meaning.partOfSpeech;
      posCount[pos] = (posCount[pos] || 0) + 1;
    });

    console.log('📊 Word forms collected:');
    Object.entries(posCount).forEach(([pos, count]) => {
      console.log(`  - ${pos}: ${count} meanings`);
    });

    const result: CambridgeWord = {
      word,
      meanings: finalMeanings,
      translation: '', // Không tự động dịch
    };

    console.log(
      `✅ Successfully crawled "${word}" - Found ${finalMeanings.length} valid meanings across ${
        Object.keys(posCount).length
      } parts of speech`
    );
    return result;
  } catch (error) {
    console.error(`❌ Error crawling "${word}":`, error);
    return null;
  }
}

// Main function để xử lý word lookup
async function processWordLookup(
  word: string
): Promise<{ data: CambridgeWord & { wordId: number }; source: 'database' | 'crawl' } | null> {
  const trimmedWord = word.trim().toLowerCase();

  // 1. Kiểm tra trong database trước
  console.log(`🔍 Checking database for word: "${trimmedWord}"`);
  const dbResult = await getWordFromDatabase(trimmedWord);

  if (dbResult) {
    console.log(`✅ Found word "${trimmedWord}" in database`);
    return { data: dbResult, source: 'database' };
  }

  // 2. Nếu không có trong database, crawl từ Cambridge
  console.log(`📡 Word "${trimmedWord}" not in database, crawling from Cambridge...`);
  const crawlResult = await crawlCambridgeWord(trimmedWord);

  if (!crawlResult) {
    return null;
  }

  // 3. Lưu vào database và lấy IDs
  const savedResult = await saveWordToDatabase(crawlResult);

  if (!savedResult) {
    return null;
  }

  return { data: savedResult, source: 'crawl' };
}

// API Route handlers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');

    if (!word || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
    }

    const result = await processWordLookup(word);

    if (!result) {
      return NextResponse.json({ error: `Word "${word}" not found` }, { status: 404 });
    }

    const response: ApiResponse = {
      ...result.data,
      source: result.source,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();

    if (!word || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const result = await processWordLookup(word);

    if (!result) {
      return NextResponse.json({ error: `Word "${word}" not found` }, { status: 404 });
    }

    const response: ApiResponse = {
      ...result.data,
      source: result.source,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
