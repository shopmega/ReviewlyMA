import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return rateLimitByEndpoint.admin(request, (req) => handler(req, params));
}

async function handler(request: NextRequest, params: Promise<{ id: string }>) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {}
                    },
                },
            }
        );

        // Verify user is admin
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        // Get claim proof data
        const { data: claim, error: claimError } = await supabase
            .from('business_claims')
            .select('proof_data, proof_methods, email, personal_phone')
            .eq('id', id)
            .single();

        if (claimError || !claim) {
            return NextResponse.json(
                { error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Use Service Role for storage operations to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Generate signed URLs for files
        const proofData = claim.proof_data || {};
        const signedUrls: Record<string, string | null> = {};
        const storageErrors: Record<string, any> = {};

        if (proofData.document_url) {
            const { data, error } = await supabaseAdmin.storage
                .from('claim-proofs')
                .createSignedUrl(proofData.document_url, 3600);
            
            if (error) {
                storageErrors.document = error;
                signedUrls.document = null;
            } else {
                signedUrls.document = data?.signedUrl || null;
            }
        }

        if (proofData.video_url) {
            const { data, error } = await supabaseAdmin.storage
                .from('claim-proofs')
                .createSignedUrl(proofData.video_url, 3600);
            
            if (error) {
                storageErrors.video = error;
                signedUrls.video = null;
            } else {
                signedUrls.video = data?.signedUrl || null;
            }
        }

        return NextResponse.json({
            claimId: id,
            proofMethods: claim.proof_methods,
            proofData: {
                ...proofData,
                email_verified: proofData.email_verified || false,
                phone_verified: proofData.phone_verified || false,
                document_uploaded: proofData.document_uploaded || false,
                video_uploaded: proofData.video_uploaded || false,
            },
            signedUrls,
            storageErrors,
            contactInfo: {
                email: claim.email,
                phone: claim.personal_phone,
            },
        });
    } catch (error) {
        console.error('Error fetching proof data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
