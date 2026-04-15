import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';

// ========================== TYPES ==========================
export interface ExtractedLead {
  name: string;
  email: string;
  phone: string;
  country?: string;
  program?: string;
  notes?: string;
  institution?: string;
  institution_code?: string;
  institution_id?: string;

  // Intelligence Layer
  score?: number;
  intent?: string;
  priority?: string;
  whatsappMessage?: string;
  smsMessage?: string;
  emailMessage?: string;
}

// ========================== OCR ==========================
export async function extractTextFromImage(file: File): Promise<string> {
  // Use node-friendly buffer path to avoid FileReader issues in server runtimes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data } = await Tesseract.recognize(buffer, 'eng', {
    logger: () => {},
  });

  return data.text || '';
}

// ========================== HELPERS ==========================

// SUPER PHONE CLEANER
function normalizeAndFixNumber(raw: string): string {
  let num = raw.replace(/\D/g, '');

  // Fix short numbers by ignoring
  if (num.length < 9) return '';

  // Handle missing country codes
  if (num.startsWith('0')) {
    num = '260' + num.substring(1); // fallback Zambia
  }

  // Ensure international format
  if (!num.startsWith('+')) {
    num = '+' + num;
  }

  return num;
}

// STRICT VALIDATION
function isValidPhone(phone: string): boolean {
  if (!phone) return false;

  const digits = phone.replace(/\D/g, '');

  return digits.length >= 10 && digits.length <= 13;
}

// EMAIL EXTRACTOR
function extractEmail(text: string): string {
  const match = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
  return match ? match[0] : '';
}

// PROGRAM EXTRACTOR
function extractProgram(text: string): string {
  const programs = [
    'MBA', 'Nursing', 'Engineering', 'Medicine', 'Law', 'Business', 'IT', 'Computer Science',
    'Diploma', 'Certificate', 'Bachelor', 'Master', 'PhD', 'Doctorate'
  ];

  const lowerText = text.toLowerCase();
  for (const prog of programs) {
    if (lowerText.includes(prog.toLowerCase())) {
      return prog;
    }
  }

  // Try to match course names
  const courseMatch = text.match(/(?:course|program|study|major):\s*([A-Z][a-z\s]+)/i);
  if (courseMatch) return courseMatch[1].trim();

  return '';
}

function extractInstitution(text: string): string {
  const match = text.match(/(?:institution|school|college|university|academy)[:\s]*([A-Z][A-Za-z0-9 &(),\-\/]+)/i);
  if (match) return match[1].trim();

  const fallback = text.match(/(?:from|at)\s+([A-Z][A-Za-z0-9 &()\-]+)/i);
  return fallback ? fallback[1].trim() : '';
}

// NAME EXTRACTOR
function extractName(text: string): string {
  // Try to extract from common patterns
  const patterns = [
    /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
    /^([A-Z][a-z]+ [A-Z][a-z]+)/i, // First capitalized name at start
    /(?:from|by|applicant|student)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  // Fallback: extract any capitalized words
  const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
  if (words.length >= 2) return words.slice(0, 2).join(' ');

  return '';
}

// Detect country (enhanced)
function detectCountry(phone: string): string {
  if (phone.startsWith('+260')) return 'Zambia';
  if (phone.startsWith('+265')) return 'Malawi';
  if (phone.startsWith('+263')) return 'Zimbabwe';
  if (phone.startsWith('+264')) return 'Namibia';
  if (phone.startsWith('+267')) return 'Botswana';
  if (phone.startsWith('+268')) return 'Eswatini';
  if (phone.startsWith('+233')) return 'Ghana';
  if (phone.startsWith('+234')) return 'Nigeria';
  if (phone.startsWith('+254')) return 'Kenya';
  if (phone.startsWith('+255')) return 'Tanzania';
  if (phone.startsWith('+256')) return 'Uganda';
  if (phone.startsWith('+257')) return 'Burundi';
  if (phone.startsWith('+258')) return 'Mozambique';
  if (phone.startsWith('+259')) return 'Zanzibar';
  if (phone.startsWith('+27')) return 'South Africa';
  return 'Unknown';
}

// Lead scoring + intent detection
function analyzeLead(lead: ExtractedLead): ExtractedLead {
  const text = (lead.notes || '').toLowerCase();

  let score = 1;
  let intent = 'General Inquiry';
  let priority = 'Low';

  if (/apply|admission|enroll|intake|ready to start/.test(text)) {
    score = 5; intent = 'Ready to Apply'; priority = 'High';
  } else if (/fees|tuition|cost|payment/.test(text)) {
    score = 4; intent = 'Pricing Inquiry'; priority = 'Medium';
  } else if (/course|program|mba|nursing|diploma|certificate|engineering|medicine/.test(text)) {
    score = 3; intent = 'Program Interest'; priority = 'Medium';
  } else if (/scholarship|funding|financial aid|bursary/.test(text)) {
    score = 4; intent = 'Financial Aid'; priority = 'Medium';
  } else if (/deadline|closing|last date|urgent|asap|immediately/.test(text)) {
    score = 4; intent = 'Urgent Inquiry'; priority = 'High';
  } else if (/contact|call|whatsapp|message/.test(text)) {
    score = 3; intent = 'Contact Request'; priority = 'Medium';
  }

  // Boost score if name and email present
  if (lead.name && lead.email) score += 1;
  if (lead.program) score += 0.5;

  return { ...lead, score, intent, priority };
}

// WhatsApp message generator
function generateWhatsAppMessage(lead: ExtractedLead): string {
  const institutionLine = lead.institution ? `\nInstitution: ${lead.institution}` : '';
  return `Hello ${lead.name || ''},\n\nI am your student enrolment advisor from Dr Moono Business Development Consultancy.${institutionLine}\n\nYour next steps:\n1. Complete the admission form online\n2. Upload your documents via our free portal\n3. Book a quick follow-up call\n\nUse our free tools to speed up the process: https://example.com/tools\n\nI am here to help you secure your place immediately.`;
}

function generateEmailMessage(lead: ExtractedLead): string {
  const institutionLine = lead.institution ? `\nInstitution: ${lead.institution}` : '';
  return `Hello ${lead.name || 'there'},\n\nThank you for reaching out to Dr Moono Business Development Consultancy.${institutionLine}\n\nWe have an application form ready for you and a free online document upload portal to simplify your submission.\n\nNext steps:\n1. Complete the relevant application form\n2. Upload required documents online\n3. Confirm your preferred programme and intake\n\nPlease reply if you need advice or want assistance with the application process.\n\nBest regards,\nEnrollment Team`;
}

function generateSmsMessage(lead: ExtractedLead): string {
  return `Hi ${lead.name || ''}, this is your admissions advisor. Use our free online tools to complete the application and upload your documents. Reply if you want help.`;
}

// IMPROVED DEDUP (BEST VERSION WINS)
function deduplicateLeads(leads: ExtractedLead[]): ExtractedLead[] {
  const map = new Map<string, ExtractedLead>();

  leads.forEach(lead => {
    const key = lead.phone || lead.email || crypto.randomUUID();

    if (!map.has(key)) {
      map.set(key, lead);
    } else {
      const existing = map.get(key)!;

      // Keep richer data
      const leadNotesLength = lead.notes?.length ?? 0;
      const existingNotesLength = existing.notes?.length ?? 0;
      if (leadNotesLength > existingNotesLength) {
        map.set(key, lead);
      }
    }
  });

  return Array.from(map.values());
}

// ========================== TEXT EXTRACTION ==========================

export function extractLeadsFromText(text: string): ExtractedLead[] {
  const leads: ExtractedLead[] = [];

  // STEP 1: CLEAN TEXT (Fix OCR issues)
  const cleanedText = text
    .replace(/[^\x00-\x7F]/g, ' ') // remove weird chars
    .replace(/\s+/g, ' ') // normalize spaces
    .replace(/O/g, '0') // OCR fix O→0
    .replace(/I/g, '1') // OCR fix I→1
    .replace(/l/g, '1') // OCR fix l→1
    .replace(/S/g, '5') // OCR fix S→5
    .replace(/B/g, '8') // OCR fix B→8
    .replace(/G/g, '6') // OCR fix G→6
    .replace(/Z/g, '2'); // OCR fix Z→2

  // STEP 2: ULTRA FLEXIBLE PHONE REGEX
  const phoneRegex = /(\+?\d[\d\s\-]{6,18}\d)/g;

  const rawMatches = cleanedText.match(phoneRegex) || [];

  // STEP 3: CLEAN + NORMALIZE NUMBERS
  const normalizedNumbers = rawMatches
    .map(num => normalizeAndFixNumber(num))
    .filter(num => isValidPhone(num));

  // STEP 4: REMOVE DUPLICATES (SMART)
  const uniqueNumbers = [...new Set(normalizedNumbers)];

  // STEP 5: BUILD LEADS
  uniqueNumbers.forEach(phone => {
    const index = cleanedText.indexOf(phone.replace('+', '').slice(-6));

    const snippet = cleanedText.substring(
      Math.max(0, index - 120),
      index + 200
    );

    const email = extractEmail(snippet);
    const name = extractName(snippet);
    const program = extractProgram(snippet);
    const institution = extractInstitution(snippet);

    let lead: ExtractedLead = {
      name,
      email,
      phone,
      notes: snippet.trim(),
      country: detectCountry(phone),
      program,
      institution,
    };

    lead = analyzeLead(lead);
    lead.whatsappMessage = generateWhatsAppMessage(lead);
    lead.emailMessage = generateEmailMessage(lead);
    lead.smsMessage = generateSmsMessage(lead);

    leads.push(lead);
  });

  return deduplicateLeads(leads);
}

// ========================== FILE HANDLER ==========================

export async function extractLeadsFromFile(file: File): Promise<ExtractedLead[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'xlsx':
    case 'xls': {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const allLeads: ExtractedLead[] = [];

      // Process ALL sheets, not just the first one
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(ws);

        const sheetLeads = data
          .map((row: any) => {
            // Support various column name formats
            const phone = normalizeAndFixNumber(
              String(row.phone || row.Phone || row['Phone Number'] || row['phone number'] || '')
            );
            const institution = String(
              row.institution || row.Institution || row.school || row.School || 
              row.college || row.College || row.university || row.University || ''
            ).trim();
            const program = String(
              row.program || row.Program || row.course || row.Course || 
              row.programme || row.Programme || row.program_of_study || ''
            ).trim();
            const country = String(row.country || row.Country || '').trim();

            let lead: ExtractedLead = {
              name: String(row.name || row.Name || row['Student Name'] || row['Full Name'] || '').trim(),
              email: String(row.email || row.Email || row['E-mail'] || '').trim(),
              phone,
              country: country || detectCountry(phone),
              program: program || 'Not specified',
              notes: String(row.notes || row.Notes || '').trim(),
              institution: institution || undefined,
            };

            lead = analyzeLead(lead);
            lead.whatsappMessage = generateWhatsAppMessage(lead);
            lead.emailMessage = generateEmailMessage(lead);
            lead.smsMessage = generateSmsMessage(lead);

            return lead;
          })
          .filter(lead => lead.name || lead.email || lead.phone); // Filter out empty rows

        allLeads.push(...sheetLeads);
      }

      return deduplicateLeads(allLeads);
    }

    case 'csv': {
      const text = await file.text();
      const results = Papa.parse(text, { header: true });
      const leads = (results.data as any[]).map((row: any) => {
        const phone = normalizeAndFixNumber(String(row.phone || ''));
        const institution = String(row.institution || row.school || row.college || '').trim();

        let lead: ExtractedLead = {
          name: row.name || '',
          email: row.email || '',
          phone,
          country: detectCountry(phone),
          notes: row.notes || '',
          institution: institution || undefined,
        };

        lead = analyzeLead(lead);
        lead.whatsappMessage = generateWhatsAppMessage(lead);
        lead.emailMessage = generateEmailMessage(lead);
        lead.smsMessage = generateSmsMessage(lead);

        return lead;
      });

      return deduplicateLeads(leads);
    }

    case 'pdf': {
      const { default: pdfjs } = await import('pdfjs-dist');
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(buffer).promise;

      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((i: any) => i.str).join(' ') + '\n';
      }

      return extractLeadsFromText(text);
    }

    case 'docx': {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return extractLeadsFromText(result.value);
    }

    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp': {
      const text = await extractTextFromImage(file);
      return extractLeadsFromText(text);
    }

    case 'txt': {
      const text = await file.text();
      return extractLeadsFromText(text);
    }

    default:
      throw new Error('Unsupported file type');
  }
}

// ========================== CLEAN VALIDATION ==========================

export function validateAndCleanLeads(leads: ExtractedLead[]): ExtractedLead[] {
  return leads.filter(lead => {
    const hasContact = lead.phone || lead.email;
    const validPhone = !lead.phone || isValidPhone(lead.phone); // Phone is optional if email exists
    return hasContact && validPhone;
  });
}
