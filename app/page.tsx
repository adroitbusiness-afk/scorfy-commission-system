'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [demoForm, setDemoForm] = useState({ name: '', email: '', organization: '' });
  const [submitting, setSubmitting] = useState(false);

  const testimonials = [
    {
      quote: "This platform transformed our recruitment pipeline. We saw a 40% increase in international enrollments within 6 months.",
      name: "Dr. Sarah Johnson",
      title: "Registrar, London Business School",
      avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    },
    {
      quote: "The AI matching saved us thousands of hours. Highly recommended for any university serious about global growth.",
      name: "Michael Chen",
      title: "Director of Admissions, University of Melbourne",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    },
    {
      quote: "We've placed over 2,000 students using this platform. The commission system for recruiters is game-changing.",
      name: "Amira Patel",
      title: "Head of Partnerships, EduGlobal",
      avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    },
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );
    document.querySelectorAll('.section-fade').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Stat counter
  useEffect(() => {
    const counters = document.querySelectorAll('[data-count]');
    const startCounting = (el: HTMLElement) => {
      const target = parseInt(el.dataset.count || '0', 10);
      let current = 0;
      const increment = target / 80;
      const update = () => {
        current += increment;
        if (current >= target) {
          el.innerText = target + (target > 1000 ? '+' : '');
          return;
        }
        el.innerText = Math.floor(current).toString();
        requestAnimationFrame(update);
      };
      update();
    };
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startCounting(entry.target as HTMLElement);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => statObserver.observe(c));
    return () => statObserver.disconnect();
  }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email || !demoForm.organization) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('demo_requests').insert({
        name: demoForm.name,
        email: demoForm.email,
        organization: demoForm.organization,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Demo request sent! We will contact you soon.');
      setDemoForm({ name: '', email: '', organization: '' });
    } catch (err) {
      toast.error('Failed to send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-gray-800 overflow-x-hidden">
      {/* ========== HEADER ========== */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-900 to-teal-600 bg-clip-text text-transparent">
              Global Smart Student Recruitment
            </h1>
            <p className="text-xs text-gray-500">Powered by Dr Moono Business Development Consultancy</p>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            <a href="#home" className="hover:text-teal-600 transition">Home</a>
            <a href="#features" className="hover:text-teal-600 transition">Solutions</a>
            <a href="#how-it-works" className="hover:text-teal-600 transition">How it works</a>
            <a href="#testimonials" className="hover:text-teal-600 transition">Testimonials</a>
            <a href="#pricing" className="hover:text-teal-600 transition">Pricing</a>
            <a href="#contact" className="hover:text-teal-600 transition">Contact</a>
          </nav>

          <div className="hidden md:flex gap-3">
            <Link href="/signup" className="bg-teal-600 text-white px-5 py-2 rounded-full font-semibold hover:shadow-lg transition">
              Sign Up Free
            </Link>
            <Link href="/login" className="border border-gray-300 px-5 py-2 rounded-full hover:bg-gray-50 transition">
              Login
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-2xl focus:outline-none">
            ☰
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur border-t py-4 px-6 flex flex-col gap-4">
            <a href="#home" onClick={() => setMobileMenuOpen(false)} className="hover:text-teal-600">Home</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="hover:text-teal-600">Solutions</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="hover:text-teal-600">How it works</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="hover:text-teal-600">Testimonials</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="hover:text-teal-600">Pricing</a>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="bg-teal-600 text-white px-4 py-2 rounded-full text-center">
              Sign Up Free
            </Link>
          </div>
        )}
      </header>

      {/* ========== HERO with BOLD STATEMENT ========== */}
      <section id="home" className="relative h-screen flex items-center justify-center text-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=2070&auto=format"
            alt="Students graduation"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/85 to-teal-600/75"></div>
        </div>

        <div className="relative z-10 max-w-4xl px-6 animate-[fadeInUp_1s_ease-out]">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight">
            Welcome to the <span className="text-teal-300">Future</span> of Student Recruitment
          </h1>
          <p className="text-xl md:text-2xl mb-6 font-light">
            Where every Lead Matters in Accessing Quality and Affordable Education
          </p>
          <p className="text-sm tracking-wide mb-8 opacity-90">Powered by Dr Moono Business Development Consultancy</p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center">
            <Link
              href="/signup"
              className="bg-gradient-to-r from-teal-500 to-teal-700 text-white px-8 py-4 rounded-full font-bold text-lg inline-flex items-center justify-center gap-2 shadow-xl hover:scale-105 transition"
            >
               Start Free Trial
            </Link>
            <a
              href="#demo"
              className="border-2 border-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-900 transition inline-flex items-center justify-center gap-2"
            >
              ▶ Watch 2-min Demo
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
            <span className="flex items-center gap-2"><span className="text-teal-300">✓</span> 50+ Universities</span>
            <span className="flex items-center gap-2"><span className="text-teal-300">✓</span> 12,000+ Students</span>
            <span className="flex items-center gap-2"><span className="text-teal-300">✓</span> 18 Countries</span>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce">
          <a href="#features" className="text-white text-2xl">↓</a>
        </div>
      </section>

      {/* ========== PROBLEM / VALUE ========== */}
      <section className="py-24 text-center bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-4">Smart Recruitment. Real Results. Zero Wasted Leads.</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-12">
            Traditional methods fail to convert quality students. Our AI-driven ecosystem ensures every applicant finds the right path.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "database", title: "Manual recruitment wastes leads", desc: "Automated pipelines with 87% conversion uplift." },
              { icon: "brain", title: "Low-quality applicants", desc: "AI filtering and matching to ideal candidates." },
              { icon: "globe", title: "Limited reach", desc: "Global network across 18+ countries." },
            ].map((item) => (
              <div key={item.title} className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="text-4xl text-teal-600 mb-4">📊</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section id="features" className="py-24 section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold tracking-wide">POWERFUL CAPABILITIES</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2">Everything you need to scale recruitment</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mt-4">From lead capture to enrollment — one intelligent platform.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: "🤖", title: "AI-Powered Lead Matching", desc: "Smart algorithm matches students to best-fit programs." },
              { icon: "🎓", title: "Affordable Education Pathways", desc: "Scholarship & financial aid integration." },
              { icon: "📈", title: "Real-Time Analytics", desc: "Dashboard with ROI, conversion funnels." },
              { icon: "🏛️", title: "Global University Network", desc: "Partner with 50+ accredited institutions." },
              { icon: "📄", title: "Automated Application Support", desc: "End-to-end document management." },
              { icon: "🛂", title: "Visa & Compliance Guidance", desc: "Regulatory support for international students." },
            ].map((feat) => (
              <div key={feat.title} className="flex gap-4 p-6 rounded-xl hover:shadow-lg transition group">
                <div className="text-3xl group-hover:scale-110 transition">{feat.icon}</div>
                <div>
                  <h3 className="text-xl font-bold">{feat.title}</h3>
                  <p className="text-gray-500">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-24 bg-blue-900 text-white section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-300 mb-12">Four simple steps to global student recruitment success</p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: "👥", title: "Capture Leads", desc: "Multi-channel lead generation forms & landing pages." },
              { icon: "🧠", title: "AI Matching", desc: "Predictive scoring and course matching." },
              { icon: "✍️", title: "Smart Applications", desc: "Auto-filled applications, document uploads." },
              { icon: "✅", title: "Enrollment & Tracking", desc: "Real-time status and commission tracking." },
            ].map((step) => (
              <div key={step.title}>
                <div className="text-4xl mb-3">{step.icon}</div>
                <h3 className="font-bold text-xl">{step.title}</h3>
                <p className="text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== STATS ========== */}
      <section className="py-20 bg-white section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { count: 12400, label: "Students Placed", suffix: "+" },
              { count: 87, label: "Conversion Rate", suffix: "%" },
              { count: 50, label: "Partner Universities", suffix: "+" },
              { count: 18, label: "Countries", suffix: "" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-900 to-teal-600 bg-clip-text text-transparent" data-count={stat.count}>
                  0
                </div>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section id="testimonials" className="py-24 bg-gray-50 section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Trusted by Education Leaders</h2>
          <p className="text-gray-500 mb-12">Real success stories from our partners</p>
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}>
              {testimonials.map((t, idx) => (
                <div key={idx} className="w-full flex-shrink-0 px-4">
                  <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
                    <div className="text-teal-600 text-3xl mb-4">“</div>
                    <p className="text-lg italic">"{t.quote}"</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <img src={t.avatar} className="w-12 h-12 rounded-full object-cover" alt={t.name} />
                      <div>
                        <strong>{t.name}</strong>
                        <p className="text-sm">{t.title}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={`h-3 rounded-full transition-all duration-300 ${currentTestimonial === i ? 'bg-teal-600 w-8' : 'bg-gray-400 w-3'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="py-24 section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Flexible Plans for Every Need</h2>
          <p className="text-gray-500 mb-12">Start free, scale as you grow</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border rounded-2xl p-8 hover:shadow-2xl transition">
              <h3 className="text-2xl font-bold">Starter</h3>
              <p className="text-4xl font-bold mt-4">$0<span className="text-base font-normal">/month</span></p>
              <ul className="mt-6 space-y-3 text-left">
                <li>✓ Up to 500 leads/month</li>
                <li>✓ Basic AI matching</li>
                <li>✓ Email support</li>
              </ul>
              <Link href="/signup" className="mt-8 inline-block border border-teal-600 text-teal-600 px-6 py-2 rounded-full font-semibold hover:bg-teal-600 hover:text-white transition">
                Get Started
              </Link>
            </div>
            <div className="border-2 border-teal-600 rounded-2xl p-8 shadow-xl relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white px-4 py-1 rounded-full text-sm">Most Popular</div>
              <h3 className="text-2xl font-bold">Professional</h3>
              <p className="text-4xl font-bold mt-4">$299<span className="text-base font-normal">/month</span></p>
              <ul className="mt-6 space-y-3 text-left">
                <li>✓ Unlimited leads</li>
                <li>✓ Advanced AI + analytics</li>
                <li>✓ Priority support + onboarding</li>
              </ul>
              <Link href="/signup" className="mt-8 inline-block bg-teal-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition">
                Start 14-day trial
              </Link>
            </div>
            <div className="border rounded-2xl p-8 hover:shadow-2xl transition">
              <h3 className="text-2xl font-bold">Enterprise</h3>
              <p className="text-4xl font-bold mt-4">Custom</p>
              <ul className="mt-6 space-y-3 text-left">
                <li>✓ Dedicated account manager</li>
                <li>✓ API access & SSO</li>
                <li>✓ Custom integrations</li>
              </ul>
              <a href="#contact" className="mt-8 inline-block border border-gray-400 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========== DEMO REQUEST (Backend integrated) ========== */}
      <section id="contact" className="py-24 bg-gradient-to-r from-blue-900 to-teal-600 text-white section-fade opacity-0 translate-y-8 transition-all duration-700">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to transform your recruitment?</h2>
          <p className="text-xl mb-8 opacity-90">Join 50+ universities already growing with us.</p>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-xl mx-auto">
            <form onSubmit={handleDemoSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Full name"
                className="px-5 py-3 rounded-full text-gray-800"
                value={demoForm.name}
                onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Work email"
                className="px-5 py-3 rounded-full text-gray-800"
                value={demoForm.email}
                onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                required
              />
              <select
                className="px-5 py-3 rounded-full text-gray-800"
                value={demoForm.organization}
                onChange={(e) => setDemoForm({ ...demoForm, organization: e.target.value })}
                required
              >
                <option value="">Select organization type</option>
                <option>University / College</option>
                <option>Recruitment Agency</option>
                <option>Affiliate Partner</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="bg-white text-blue-900 font-bold py-3 rounded-full hover:shadow-xl transition disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Request Demo →'}
              </button>
            </form>
            <p className="text-xs mt-4 opacity-80">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-xl">Global Smart Student Recruitment</h3>
            <p className="text-sm mt-2">Powered by Dr Moono Business Development Consultancy</p>
            <div className="flex gap-4 mt-4">
              <a href="#" className="hover:text-teal-400">LinkedIn</a>
              <a href="#" className="hover:text-teal-400">Twitter</a>
              <a href="#" className="hover:text-teal-400">Facebook</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white">Platform</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#features" className="hover:text-teal-400">Features</a></li>
              <li><a href="#pricing" className="hover:text-teal-400">Pricing</a></li>
              <li><a href="#">Demo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Resources</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#">Blog</a></li>
              <li><a href="#">Case studies</a></li>
              <li><a href="#">Help center</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Legal</h4>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
              <li><a href="#">Cookie policy</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-sm pt-8 border-t border-gray-800 mt-8">
          © 2026 Global Smart Student Recruitment. Every Lead Matters.
        </div>
      </footer>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .section-fade.show { opacity: 1 !important; transform: translateY(0) !important; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate\\[fadeInUp_1s_ease-out\\] {
          animation: fadeInUp 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}