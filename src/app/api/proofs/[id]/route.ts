import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByEndpoint } from '@/lib/api-rate-limiter';
import { createAdminClient, verifyAdminPermission } from '@/lib/supabase/admin';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    return rateLimitByEndpoint.admin(request, (req) => handler(req, params));
}

async function handler(request: NextRequest, params: Promise<{ id: string }>) {
    try {
        await verifyAdminPermission('moderation.claim.proofs');
        const { id } = await params;
        const supabaseAdmin = await createAdminClient();

        // Get claim proof data
        const { data: claim, error: claimError } = await supabaseAdmin
            .from('business_claims')
            .select('proof_data, proof_methods, email, phone')
            .eq('id', id)
            .single();

        if (claimError || !claim) {
            return NextResponse.json(
                { error: 'Claim not found' },
                { status: 404 }
            );
        }

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
                phone: claim.phone,
            },
        });
    } catch (error) {
        const message = String((error as Error)?.message || '');
        if (message.includes('session invalide')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (message.includes("permission 'moderation.claim.proofs'") || message.includes('Non autorise')) {
            return NextResponse.json({ error: 'Forbidden: claim proof access requires moderation permission' }, { status: 403 });
        }
        console.error('Error fetching proof data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
