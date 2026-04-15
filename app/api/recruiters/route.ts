import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Recruiters endpoint is available',
  })
}
