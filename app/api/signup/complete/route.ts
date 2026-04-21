import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await request.json();
    const {
      user_id,
      role,
      full_name,
      email,
      phone,
      institution_id,
      consultancy_id,
      referred_by,
      referral_code,
    } = payload;

    if (!user_id || !role || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, full_name, email' },
        { status: 400 }
      );
    }

    const validRoles = ['student', 'recruiter', 'affiliate', 'institution_admin', 'consultancy_admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'affiliate' && !institution_id) {
      return NextResponse.json({ error: 'Institution is required for affiliate signup' }, { status: 400 });
    }
    if (role === 'institution_admin' && !institution_id) {
      return NextResponse.json({ error: 'Institution is required for institution admin signup' }, { status: 400 });
    }
    if (role === 'consultancy_admin' && !consultancy_id) {
      return NextResponse.json({ error: 'Consultancy is required for consultancy admin signup' }, { status: 400 });
    }

    // 1. Upsert profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user_id,
          full_name,
          email,
          phone_number: phone || null,
          role,
          institution_id: institution_id || null,
          consultancy_id: consultancy_id || null,
          referred_by: referred_by || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    if (profileError) {
      console.error('Profile upsert error:', profileError);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    // 2. Role‑specific records
    if (role === 'recruiter') {
      const finalReferralCode = referral_code || `REF${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
      const { error: recruiterError } = await supabaseAdmin
        .from('recruiters')
        .upsert(
          {
            user_id,
            referral_code: finalReferralCode,
            total_earnings: 0,
            status: 'active',
            institution_id: institution_id || null,
          },
          { onConflict: 'user_id' }
        );
      if (recruiterError) {
        console.error('Recruiter insert error:', recruiterError);
        return NextResponse.json({ error: 'Failed to create recruiter record' }, { status: 500 });
      }
    } else if (role === 'affiliate') {
      const { error: affiliateError } = await supabaseAdmin
        .from('affiliates')
        .upsert(
          {
            user_id,
            institution_id,
            commission_rate: 5.0,
            total_earned: 0,
            status: 'active',
          },
          { onConflict: 'user_id' }
        );
      if (affiliateError) {
        console.error('Affiliate insert error:', affiliateError);
        return NextResponse.json({ error: 'Failed to create affiliate record' }, { status: 500 });
      }
    } else if (role === 'institution_admin') {
      // Add to institution_team_members
      const { error: teamError } = await supabaseAdmin
        .from('institution_team_members')
        .upsert(
          {
            institution_id,
            user_id,
            role: 'admin',
            permissions: { all: true },
          },
          { onConflict: 'institution_id, user_id' }
        );
      if (teamError) {
        console.error('Institution team insert error:', teamError);
      }
    } else if (role === 'consultancy_admin') {
      // Optionally add to consultancy_team_members (ignore if table missing)
      try {
        const { error: teamError } = await supabaseAdmin
          .from('consultancy_team_members')
          .upsert(
            {
              consultancy_id,
              user_id,
              role: 'admin',
              permissions: { all: true },
            },
            { onConflict: 'consultancy_id, user_id' }
          );
        if (teamError) console.warn('Consultancy team table may not exist:', teamError);
      } catch (err) {
        console.warn('Consultancy team table may not exist');
      }
    }

    // 3. If referred and student, create lead record
    if (referred_by && role === 'student') {
      const { error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          referrer_id: referred_by,
          referred_user_id: user_id,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      if (leadError) console.error('Lead creation error:', leadError);
    }

    return NextResponse.json(
      { message: 'Profile completed successfully', user_id },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Signup complete error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}