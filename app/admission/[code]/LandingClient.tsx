'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, MessageCircle, ShieldCheck, Star } from 'lucide-react';

const STORAGE_KEY = 'dmdbc_referral_code';
const COOKIE_KEY = 'dmdbc_referral_code';

function saveReferralCode(code: string) {
  if (typeof window === 'undefined' || !code) return;
  localStorage.setItem(STORAGE_KEY, code);
  sessionStorage.setItem(STORAGE_KEY, code);
  document.cookie = `${COOKIE_KEY}=${code}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function getWhatsAppUrl(code: string) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '260760851325';
  const message = `Hello DMBDC, I was referred by recruiter ${code} and would like help with my admission.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default function LandingClient({ referralCode }: { referralCode: string }) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (!referralCode) return;
    saveReferralCode(referralCode);
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, [referralCode]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-gradient-to-br from-blue-800 via-indigo-700 to-cyan-700 p-10 text-white shadow-2xl shadow-slate-900/10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white mb-6">
              <Star className="h-5 w-5 text-yellow-300" />
              Special Admission Referral Landing Page
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Fast-track your admission with a trusted recruiter.
            </h1>
            <p className="mt-6 max-w-3xl text-lg text-blue-100/90 leading-8">
              Your recruiter will receive full commission credit when you apply through this referral link.
              We have saved your referral code and will carry it through the application process.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <Link
                href={`/signup?ref=${referralCode}`}
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-white px-6 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5"
              >
                Start Your Application
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href={getWhatsAppUrl(referralCode)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/25 bg-white/10 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/20"
              >
                Contact Admissions
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/10 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-200">Referral code</p>
                <p className="mt-3 text-2xl font-semibold text-white">{referralCode}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-200">Tracking saved</p>
                <p className="mt-3 text-2xl font-semibold text-white">Yes</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-200">You can share</p>
                <p className="mt-3 text-2xl font-semibold text-white">{origin ? `${origin}/admission/${referralCode}` : '...'}</p>
              </div>
            </div>

            <div className="mt-10 rounded-3xl bg-white/10 p-6 border border-white/15">
              <div className="flex items-center gap-3 text-white">
                <ShieldCheck className="h-6 w-6 text-cyan-200" />
                <p className="text-sm leading-6">
                  Your recruiter gets commission credit when you apply using this link. Admission tracking is stored locally and preserved through the sign-up path.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-[2rem] bg-white p-8 shadow-xl shadow-slate-900/5">
            <h2 className="text-2xl font-semibold text-slate-900">Why this landing page?</h2>
            <ul className="mt-6 space-y-4 text-slate-600">
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-5 w-5 text-green-600" />
                <span>Securely link your application to the recruiter who referred you.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-5 w-5 text-green-600" />
                <span>Automatically carry the referral code into the enrollment process.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="mt-1 h-5 w-5 text-green-600" />
                <span>Fast admission messaging and recruiter commission tracking.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/10">
            <h2 className="text-2xl font-semibold">Need help now?</h2>
            <p className="mt-4 text-slate-300 leading-7">
              Our admissions team is ready to help you complete the application, confirm fees, and secure your offer letter.
            </p>
            <a
              href={getWhatsAppUrl(referralCode)}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-3xl bg-cyan-500 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Message Admissions
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
