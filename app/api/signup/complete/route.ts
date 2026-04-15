import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials')
    }

    // Create Supabase admin client (server-side with service role)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Parse the payload from your signup component
    const body = await request.json()
    const {
      user_id,
      role,
      full_name,
      email,
      phone,
      institution_id,
      referred_by,
      referral_code,
    } = body

    // Basic validation
    if (!user_id || !role || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, full_name, email' },
        { status: 400 }
      )
    }
    if (!['student', 'recruiter', 'affiliate'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (role === 'affiliate' && !institution_id) {
      return NextResponse.json(
        { error: 'Institution is required for affiliate signup' },
        { status: 400 }
      )
    }

    // 1. Insert or update the user's profile
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
          referred_by: referred_by || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      )
    }

    // 2. Role-specific tables
    if (role === 'recruiter') {
      // Generate a unique referral code if not provided
      const finalReferralCode =
        referral_code || `REF${Date.now()}${Math.random().toString(36).substring(2, 8)}`
      const { error: recruiterError } = await supabaseAdmin
        .from('recruiters')
        .upsert(
          {
            user_id,
            referral_code: finalReferralCode,
            total_earnings: 0,
            status: 'active',
          },
          { onConflict: 'user_id' }
        )

      if (recruiterError) {
        console.error('Recruiter insert error:', recruiterError)
        return NextResponse.json(
          { error: 'Failed to create recruiter record' },
          { status: 500 }
        )
      }
    } else if (role === 'affiliate') {
      const { error: affiliateError } = await supabaseAdmin
        .from('affiliates')
        .upsert(
          {
            user_id,
            institution_id,
            total_earnings: 0,
            status: 'pending',
          },
          { onConflict: 'user_id' }
        )

      if (affiliateError) {
        console.error('Affiliate insert error:', affiliateError)
        return NextResponse.json(
          { error: 'Failed to create affiliate record' },
          { status: 500 }
        )
      }
    }

    // 3. If the user was referred and is a student, create a lead record
    if (referred_by && role === 'student') {
      const { error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          referrer_id: referred_by,
          referred_user_id: user_id,
          status: 'pending',
          created_at: new Date().toISOString(),
        })

      if (leadError) {
        console.error('Lead creation error:', leadError)
        // Non‑critical, don't fail the whole signup
      }
    }

    return NextResponse.json(
      { message: 'Profile completed successfully', user_id },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('Signup complete error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}