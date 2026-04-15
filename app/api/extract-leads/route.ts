import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let leads: any[] = [];

    if (fileType === 'csv') {
      const text = await file.text();
      const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
      leads = data.map((row: any) => ({
        name: row.Name || row.name || row['Student Name'] || 'Unknown',
        email: row.Email || row.email || '',
        phone: row.Phone || row.phone || '',
        program: row.Program || row.program || 'Not specified',
        country: row.Country || row.country || null,
        notes: 'Imported from CSV',
      }));
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      leads = rows.map((row: any) => ({
        name: row.Name || row.name || row['Student Name'] || 'Unknown',
        email: row.Email || row.email || '',
        phone: row.Phone || row.phone || '',
        program: row.Program || row.program || 'Not specified',
        country: row.Country || row.country || null,
        notes: 'Imported from Excel',
      }));
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload CSV or Excel files.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}