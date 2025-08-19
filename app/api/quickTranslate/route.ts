import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TRANSLATE_API =
  process.env.quickTranslate ||
  'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=';

export async function POST(request: NextRequest) {
  console.log('Received request for quick translation');
  try {
    const { text, definitions, meaningIds } = await request.json();

    if (!text && !definitions) {
      return NextResponse.json({ error: 'Text or definitions array is required' }, { status: 400 });
    }

    // Nếu có nhiều definitions thì dịch từng cái và lưu vào database
    if (definitions && Array.isArray(definitions)) {
      const translatedDefinitions = await Promise.all(
        definitions.map(async (definition: string, index: number) => {
          try {
            const encodedText = encodeURIComponent(definition);
            const translateUrl = `${TRANSLATE_API}${encodedText}`;

            const response = await fetch(translateUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            });

            if (!response.ok) {
              return { original: definition, translated: definition }; // Fallback
            }

            const data = await response.text();
            const parsed = JSON.parse(data);
            const translatedText = parsed[0][0][0];

            // Nếu có meaningIds thì cập nhật database
            if (meaningIds && meaningIds[index]) {
              try {
                await prisma.wordMeaning.update({
                  where: { id: meaningIds[index] },
                  data: { vnDefinition: translatedText },
                });
              } catch (dbError) {
                console.error('Database update error for meaning:', meaningIds[index], dbError);
              }
            }

            return {
              original: definition,
              translated: translatedText,
            };
          } catch (error) {
            console.error('Translation error for:', definition, error);
            return { original: definition, translated: definition };
          }
        })
      );

      return NextResponse.json({
        translatedDefinitions,
      });
    }

    // Dịch single text
    const encodedText = encodeURIComponent(text);
    const translateUrl = `${TRANSLATE_API}${encodedText}`;

    const response = await fetch(translateUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.text();
    const parsed = JSON.parse(data);
    const translatedText = parsed[0][0][0];

    return NextResponse.json({
      originalText: text,
      translatedText: translatedText,
      sourceLanguage: 'en',
      targetLanguage: 'vi',
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate text' }, { status: 500 });
  }
}
