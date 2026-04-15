import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeLead } from '@/lib/aiLeadEngine';
import Tesseract from 'tesseract.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

type IncomingLead = {
  name?: string;
  email?: string;
  phone?: string;
  country?: string;
  program?: string;
  notes?: string;
  institution_id?: string | null;
  source?: string;
};

// Helper: extract phone numbers and messages from WhatsApp text
function extractWhatsAppLeads(text: string): IncomingLead[] {
  const lines = text.split(/\r?\n/);
  const leadsMap = new Map<string, IncomingLead>();
  let currentPhone = '';
  let currentMessage = '';

  for (const line of lines) {
    const phoneMatch = line.match(/(\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4})/);
    if (phoneMatch) {
      if (currentPhone && currentMessage) {
        leadsMap.set(currentPhone, {
          phone: currentPhone,
          name: currentPhone,
          notes: currentMessage.trim(),
          source: 'WhatsApp OCR',
        });
      }
      currentPhone = phoneMatch[1].replace(/\s/g, '');
      currentMessage = '';
    } else if (currentPhone && line.trim()) {
      currentMessage += ' ' + line.trim();
    }
  }
  if (currentPhone && currentMessage) {
    leadsMap.set(currentPhone, {
      phone: currentPhone,
      name: currentPhone,
      notes: currentMessage.trim(),
      source: 'WhatsApp OCR',
    });
  }
  if (leadsMap.size === 0) {
    // If no phone numbers, treat each line as a separate lead
    for (const line of lines) {
      if (line.trim()) {
        leadsMap.set(line.trim(), {
          name: line.trim(),
          notes: line.trim(),
          source: 'Text OCR',
        });
      }
    }
  }
  return Array.from(leadsMap.values());
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let leads: IncomingLead[] = [];
    let institutionId: string | null = null;
    let preferredRecruiter: string | null = null;

    // Handle multipart/form-data (image upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      institutionId = formData.get('institution_id') as string || null;
      preferredRecruiter = formData.get('recruiter_id') as string || null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
        logger: (m) => console.log(m),
      });
      leads = extractWhatsAppLeads(text);
    } 
    // Handle JSON (existing logic)
    else {
      const body = await req.json();
      leads = body?.leads || [];
      institutionId = body?.institution_id ?? null;
      preferredRecruiter = body?.recruiter_id ?? null;

      if (!Array.isArray(leads) || leads.length === 0) {
        return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
      }
    }

    // Fetch active recruiters for round‑robin
    let recruiters: string[] = [];
    if (!preferredRecruiter) {
      const { data } = await supabase
        .from('recruiters')
        .select('id')
        .eq('status', 'active');
      recruiters = (data || []).map((r) => r.id);
    }

    let rrIndex = 0;
    let inserted = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const raw of leads) {
      const phone = raw.phone?.trim() || null;
      const email = raw.email?.trim() || null;

      const assignedRecruiter =
        preferredRecruiter ||
        (recruiters.length > 0 ? recruiters[rrIndex++ % recruiters.length] : null);

      // Check existing lead by phone or email
      let existingId: string | null = null;
      if (phone || email) {
        const orFilters = [];
        if (phone) orFilters.push(`phone.eq.${phone}`);
        if (email) orFilters.push(`email.eq.${email}`);
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(orFilters.join(','))
          .limit(1)
          .maybeSingle();
        existingId = existing?.id || null;
      }

      const analysis = analyzeLead({
        name: raw.name || '',
        email: raw.email || '',
        phone: raw.phone || '',
        notes: raw.notes || '',
        country: raw.country,
      });

      const payload = {
        name: raw.name || '',
        email,
        phone,
        country: raw.country || analysis.country || null,
        program: raw.program || null,
        notes: raw.notes || null,
        institution_id: raw.institution_id ?? institutionId,
        assigned_recruiter: assignedRecruiter,
        status: 'new',
        source: raw.source || (contentType.includes('multipart') ? 'Image OCR' : 'import'),
        lead_score: analysis.score,
        intent: analysis.intent,
        priority: analysis.priority,
        recommended_action: analysis.action,
        tags: (analysis.tags || []).join(','), // store as comma-separated string
        updated_at: now,
        created_at: now,
      };

      if (existingId) {
        const { error } = await supabase.from('leads').update(payload).eq('id', existingId);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
        inserted++;
      }
    }

    return NextResponse.json({ inserted, updated });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Ingest failed' }, { status: 500 });
  }
}