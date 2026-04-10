import { NextResponse } from 'next/server';
import { parseSkFidelityWorkbook } from '@/lib/mfo/parse-workbook';
import { parsePortfolioSnapshot } from '@/lib/mfo/schema';

export const runtime = 'nodejs';

/**
 * POST multipart form field `file` (.xlsx) → validated portfolio snapshot JSON.
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'Missing file' }, { status: 400 });
    }
    const blob = file as Blob;
    const buf = Buffer.from(await blob.arrayBuffer());
    const parsed = await parseSkFidelityWorkbook(buf);

    const snapshot = parsePortfolioSnapshot({
      snapshotAt: new Date().toISOString(),
      assumptions: parsed.assumptions,
      rows: parsed.rows,
      sheetName: 'SK_Fidelity',
      priceAsOfDates: parsed.priceAsOfDates,
    });

    return NextResponse.json({ success: true, data: snapshot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
