'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Clock, Check, Loader2, X, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/components/providers/i18n-provider';

interface Claim {
    id: string;
    status: string;
    business_id: string;
    created_at: string;
    full_name: string;
    job_title: string;
    email: string;
    proof_methods?: string[];
    proof_status?: Record<string, string>;
    proof_data?: Record<string, any>;
}

interface Business {
    id: string;
    name: string;
}

export default function PendingPage() {
    const [claim, setClaim] = useState<Claim | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifyingMethod, setVerifyingMethod] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<{ document?: File; video?: File }>({});
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { t, tf, locale } = useI18n();
    const dateLocale = locale === 'fr' ? 'fr-FR' : locale === 'ar' ? 'ar-MA' : 'en-US';
    const methodLabel = (method: string) => t(`dashboardPendingPage.verification.methods.${method}`, method);

    useEffect(() => {
        const fetchClaimStatus = async () => {
            try {
                const supabase = createClient();

                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                    console.error('Auth error:', authError);
                    setError(t('dashboardPendingPage.errors.auth', 'Authentication error'));
                    setLoading(false);
                    return;
                }
                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: claims, error: claimError } = await supabase
                    .from('business_claims')
                    .select()
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (claimError) {
                    console.error('Claim error:', {
                        message: claimError.message,
                        code: claimError.code,
                        details: claimError.details,
                    });
                    setError(
                        tf('dashboardPendingPage.errors.loadClaim', 'Error loading claim: {message}', {
                            message: claimError.message,
                        })
                    );
                    setLoading(false);
                    return;
                }

                if (!claims || claims.length === 0) {
                    router.push('/');
                    return;
                }

                const userClaim = claims[0];

                if (userClaim.status === 'approved') {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role, business_id')
                        .eq('id', user.id)
                        .single();

                    if (!profileError && profile) {
                        // Only update if user doesn't already have a business
                        if (profile.role !== 'pro' || !profile.business_id) {
                            await supabase
                                .from('profiles')
                                .update({ role: 'pro', business_id: userClaim.business_id })
                                .eq('id', user.id);
                        }
                    }

                    window.location.href = '/dashboard';
                    return;
                }

                setClaim(userClaim);

                if (userClaim.business_id) {
                    const { data: businessData } = await supabase
                        .from('businesses')
                        .select('id, name')
                        .eq('id', userClaim.business_id)
                        .single();

                    if (businessData) {
                        setBusiness(businessData);
                    }
                }

                setLoading(false);
            } catch (err: any) {
                console.error('Error fetching claim:', err);
                setError(
                    tf('dashboardPendingPage.errors.generic', 'Error: {message}', {
                        message: err?.message || 'Unknown error',
                    })
                );
                setLoading(false);
            }
        };

        fetchClaimStatus();
    }, [router, t, tf]);

    const handleVerifyCode = async (method: string) => {
        if (!verificationCode.trim()) {
            toast({
                title: t('common.error', 'Error'),
                description: t('dashboardPendingPage.errors.enterCode', 'Please enter the verification code.'),
                variant: 'destructive',
            });
            return;
        }

        setIsVerifying(true);
        try {
            const supabase = createClient();

            const { data: codes, error: codeError } = await supabase
                .from('verification_codes')
                .select()
                .eq('claim_id', claim?.id)
                .eq('method', method)
                .eq('code', verificationCode.toUpperCase())
                .gt('expires_at', new Date().toISOString())
                .single();

            if (codeError || !codes) {
                toast({
                    title: t('common.error', 'Error'),
                    description: t('dashboardPendingPage.errors.invalidCode', 'Invalid or expired code.'),
                    variant: 'destructive',
                });
                return;
            }

            await supabase
                .from('verification_codes')
                .update({ verified: true, verified_at: new Date().toISOString() })
                .eq('id', codes.id);

            const newProofStatus = { ...claim?.proof_status, [method]: 'verified' };
            const newProofData = { ...claim?.proof_data, [method + '_verified']: true };

            await supabase
                .from('business_claims')
                .update({ proof_status: newProofStatus, proof_data: newProofData })
                .eq('id', claim?.id);

            toast({
                title: t('common.success', 'Success'),
                description: tf('dashboardPendingPage.toasts.verified', '{method} verified successfully!', {
                    method: methodLabel(method),
                }),
            });
            setVerificationCode('');
            setVerifyingMethod(null);

            if (claim) {
                setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
            }
        } catch (err: any) {
            console.error('Verification error:', err);
            toast({
                title: t('common.error', 'Error'),
                description: t('dashboardPendingPage.errors.verificationFailed', 'Verification failed. Please try again.'),
                variant: 'destructive',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDocumentUpload = async (file: File) => {
        if (!file || !claim) return;
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: t('common.error', 'Error'),
                description: t('dashboardPendingPage.errors.fileTooLargeDoc', 'File too large (max 10MB)'),
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();

            const ext = file.name.split('.').pop() || 'pdf';
            const docPath = `claims/${claim.id}/document-${Date.now()}.${ext}`;

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('claim-proofs')
                .upload(docPath, file);

            if (uploadError) {
                console.error('Storage error details:', {
                    message: uploadError.message,
                    status: (uploadError as any).status,
                    statusCode: (uploadError as any).statusCode,
                    name: uploadError.name,
                });
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const newProofStatus = { ...claim.proof_status, document: 'pending_review' };
            const newProofData = {
                ...(claim.proof_data || {}),
                document_uploaded: true,
                document_url: docPath,
            };

            const { error: updateError } = await supabase
                .from('business_claims')
                .update({
                    proof_status: newProofStatus,
                    proof_data: newProofData
                })
                .eq('id', claim.id);

            if (updateError) {
                console.error('Update error:', updateError);
                throw updateError;
            }

            toast({
                title: t('common.success', 'Success'),
                description: t('dashboardPendingPage.toasts.documentUploaded', 'Document uploaded. Our team will review it.'),
            });
            setUploadedFiles(prev => ({ ...prev, document: file }));
            setVerifyingMethod(null);
            setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
        } catch (err: any) {
            console.error('Document upload error:', err);
            console.error('Error details:', {
                message: err?.message,
                cause: err?.cause,
            });
            toast({
                title: t('common.error', 'Error'),
                description: err?.message || t('dashboardPendingPage.errors.uploadFailed', 'Upload failed. Please try again.'),
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleVideoUpload = async (file: File) => {
        if (!file || !claim) return;
        if (file.size > 100 * 1024 * 1024) {
            toast({
                title: t('common.error', 'Error'),
                description: t('dashboardPendingPage.errors.fileTooLargeVideo', 'Video too large (max 100MB)'),
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();

            const ext = file.name.split('.').pop() || 'mp4';
            const vidPath = `claims/${claim.id}/video-${Date.now()}.${ext}`;

            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('claim-proofs')
                .upload(vidPath, file);

            if (uploadError) {
                console.error('Storage error details:', {
                    message: uploadError.message,
                    status: (uploadError as any).status,
                    statusCode: (uploadError as any).statusCode,
                });
                throw new Error(`Upload failed: ${uploadError.message}`);
            }

            const newProofStatus = { ...claim.proof_status, video: 'pending_review' };
            const newProofData = {
                ...(claim.proof_data || {}),
                video_uploaded: true,
                video_url: vidPath,
            };

            const { error: updateError } = await supabase
                .from('business_claims')
                .update({
                    proof_status: newProofStatus,
                    proof_data: newProofData
                })
                .eq('id', claim.id);

            if (updateError) {
                console.error('Update error:', updateError);
                throw updateError;
            }

            toast({
                title: t('common.success', 'Success'),
                description: t('dashboardPendingPage.toasts.videoUploaded', 'Video uploaded. Our team will review it.'),
            });
            setUploadedFiles(prev => ({ ...prev, video: file }));
            setVerifyingMethod(null);
            setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
        } catch (err: any) {
            console.error('Video upload error:', err);
            console.error('Error details:', {
                message: err?.message,
                cause: err?.cause,
            });
            toast({
                title: t('common.error', 'Error'),
                description: err?.message || t('dashboardPendingPage.errors.uploadFailed', 'Upload failed. Please try again.'),
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const getProofBadge = (method: string) => {
        const status = claim?.proof_status?.[method] || 'pending';
        const isVerified = status === 'verified' || status === 'pending_review';
        const methodIcons: Record<string, string> = {
            email: '📧',
            phone: '📱',
            document: '📄',
            video: '🎥',
        };

        return (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${isVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <span className="text-lg">{methodIcons[method]}</span>
                <div className="flex-1">
                    <p className="font-medium">{methodLabel(method)}</p>
                    <p className={`text-xs ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {isVerified
                            ? (status === 'pending_review'
                                ? t('dashboardPendingPage.verification.proof.inReview', 'In review')
                                : t('dashboardPendingPage.verification.proof.verified', 'Verified'))
                            : t('dashboardPendingPage.verification.proof.pending', 'Pending verification')}
                    </p>
                </div>
                {isVerified && <Check className="h-5 w-5 text-green-600" />}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t('dashboardPendingPage.loading.title', 'Loading...')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse">{t('dashboardPendingPage.loading.description', 'Please wait')}</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            {t('dashboardPendingPage.error.title', 'Error')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <p className="text-xs text-muted-foreground mb-4">
                            {t('dashboardPendingPage.error.consoleHint', 'Check browser console for details')}
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/login">{t('dashboardPendingPage.error.backToLogin', 'Back to login')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!claim) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>{t('dashboardPendingPage.empty.title', 'No claim found')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t(
                                'dashboardPendingPage.empty.description',
                                "You don't have a pending claim. Please create a pro account first."
                            )}
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/pro/signup">{t('dashboardPendingPage.empty.createPro', 'Create pro account')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="w-full max-w-2xl space-y-6">
                <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <Clock className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                                <div>
                                    <CardTitle className="text-amber-900">
                                        {claim.status === 'pending'
                                            ? t('dashboardPendingPage.status.pendingApproval', 'Claim pending approval')
                                            : claim.status === 'rejected'
                                                ? t('dashboardPendingPage.status.rejected', 'Claim rejected')
                                                : t('dashboardPendingPage.status.processing', 'Processing')}
                                    </CardTitle>
                                    <CardDescription className="text-amber-800 mt-1">
                                        {claim.status === 'pending' &&
                                            t(
                                                'dashboardPendingPage.status.pendingDescription',
                                                'Your claim is pending review by our moderators. This usually takes 24-48 hours.'
                                            )}
                                        {claim.status === 'rejected' &&
                                            t(
                                                'dashboardPendingPage.status.rejectedDescription',
                                                'Your claim was rejected. Please verify the information and try again.'
                                            )}
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboardPendingPage.claimDetails.title', 'Claim details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.business', 'Business')}
                                </p>
                                <p className="text-lg font-semibold">
                                    {business?.name || t('dashboardPendingPage.claimDetails.businessLoading', 'Loading...')}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.status', 'Status')}
                                </p>
                                <p className="text-lg font-semibold capitalize">
                                    {claim.status === 'pending' && (
                                        <span className="text-amber-600">{t('dashboardPendingPage.claimDetails.status.pending', 'Pending')}</span>
                                    )}
                                    {claim.status === 'approved' && (
                                        <span className="text-green-600">{t('dashboardPendingPage.claimDetails.status.approved', 'Approved')}</span>
                                    )}
                                    {claim.status === 'rejected' && (
                                        <span className="text-red-600">{t('dashboardPendingPage.claimDetails.status.rejected', 'Rejected')}</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.name', 'Your name')}
                                </p>
                                <p className="text-lg font-semibold">{claim.full_name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.title', 'Your title')}
                                </p>
                                <p className="text-lg font-semibold">{claim.job_title}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.email', 'Email')}
                                </p>
                                <p className="text-lg font-semibold">{claim.email}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('dashboardPendingPage.claimDetails.fields.date', 'Date')}
                                </p>
                                <p className="text-lg font-semibold">
                                    {new Date(claim.created_at).toLocaleDateString(dateLocale, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {claim?.proof_methods && claim.proof_methods.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-blue-600" />
                                {t('dashboardPendingPage.verification.title', 'Identity verification')}
                            </CardTitle>
                            <CardDescription className="text-blue-900">
                                {t('dashboardPendingPage.verification.subtitle', 'Complete verification to speed up approval')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {claim.proof_methods.map((method) => {
                                    const isVerified = claim.proof_status?.[method] === 'verified' || claim.proof_status?.[method] === 'pending_review';
                                    const isPending = !isVerified;

                                    return (
                                        <div key={method} className="space-y-2">
                                            {getProofBadge(method)}

                                            {isPending && verifyingMethod === method && (
                                                <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                                                    {method === 'email' && (
                                                        <div>
                                                            <Label htmlFor={`code-${method}`} className="text-sm">
                                                                {t('dashboardPendingPage.verification.inputs.emailCodeLabel', 'Verification code (6 digits)')}
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                {tf('dashboardPendingPage.verification.inputs.emailHint', 'Check your email {email}', {
                                                                    email: claim.email,
                                                                })}
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    id={`code-${method}`}
                                                                    placeholder="000000"
                                                                    value={verificationCode}
                                                                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                                                                    maxLength={6}
                                                                    className="flex-1 uppercase text-center"
                                                                />
                                                                <Button onClick={() => handleVerifyCode(method)} disabled={isVerifying}>
                                                                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                                </Button>
                                                                <Button variant="outline" onClick={() => setVerifyingMethod(null)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {method === 'phone' && (
                                                        <div>
                                                            <Label htmlFor={`code-${method}`} className="text-sm">
                                                                {t('dashboardPendingPage.verification.inputs.smsCodeLabel', 'SMS code (6 digits)')}
                                                            </Label>
                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                {t('dashboardPendingPage.verification.inputs.smsHint', 'Check your SMS messages')}
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    id={`code-${method}`}
                                                                    placeholder="000000"
                                                                    value={verificationCode}
                                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                                    maxLength={6}
                                                                    className="flex-1 text-center"
                                                                />
                                                                <Button onClick={() => handleVerifyCode(method)} disabled={isVerifying}>
                                                                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                                </Button>
                                                                <Button variant="outline" onClick={() => setVerifyingMethod(null)}>
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {method === 'document' && (
                                                        <div>
                                                            <label className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 block">
                                                                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                                                <p className="text-sm font-medium">
                                                                    {t('dashboardPendingPage.verification.upload.documentTitle', 'Upload document')}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {t('dashboardPendingPage.verification.upload.documentHint', 'PDF, JPG, PNG (max 10MB)')}
                                                                </p>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.jpg,.png,.jpeg"
                                                                    className="hidden"
                                                                    onChange={(e) => e.target.files?.[0] && handleDocumentUpload(e.target.files[0])}
                                                                    disabled={isUploading}
                                                                />
                                                            </label>
                                                            {uploadedFiles.document && (
                                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                                    <Check className="h-3 w-3" /> {uploadedFiles.document.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {method === 'video' && (
                                                        <div>
                                                            <label className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 block">
                                                                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                                                <p className="text-sm font-medium">
                                                                    {t('dashboardPendingPage.verification.upload.videoTitle', 'Upload video')}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {t('dashboardPendingPage.verification.upload.videoHint', 'MP4, WebM (max 100MB)')}
                                                                </p>
                                                                <input
                                                                    type="file"
                                                                    accept=".mp4,.webm,.mov"
                                                                    className="hidden"
                                                                    onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
                                                                    disabled={isUploading}
                                                                />
                                                            </label>
                                                            {uploadedFiles.video && (
                                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                                    <Check className="h-3 w-3" /> {uploadedFiles.video.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isPending && verifyingMethod !== method && (
                                                <Button variant="outline" onClick={() => setVerifyingMethod(method)} className="w-full" disabled={isUploading}>
                                                    {t('dashboardPendingPage.verification.actions.verifyNow', 'Verify now')}
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboardPendingPage.nextSteps.title', 'Next steps')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                {claim.status === 'pending' && (
                                    <>
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Clock className="h-3 w-3 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{t('dashboardPendingPage.nextSteps.step1.title', '1. Complete verification')}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {t('dashboardPendingPage.nextSteps.step1.description', 'Verify above, then our team reviews')}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{t('dashboardPendingPage.nextSteps.step2.title', '2. Approval')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('dashboardPendingPage.nextSteps.step2.description', "You'll get a confirmation email")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{t('dashboardPendingPage.nextSteps.step3.title', '3. Dashboard access')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t('dashboardPendingPage.nextSteps.step3.description', 'Manage reviews and more')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg mt-6">
                            <p className="text-sm text-muted-foreground mb-2">
                                <strong>{t('dashboardPendingPage.tip.title', 'Tip:')}</strong>{' '}
                                {t('dashboardPendingPage.tip.description', 'Check your email (including spam) for important notifications.')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button asChild variant="outline" className="flex-1">
                        <Link href="/">{t('dashboardPendingPage.actions.backHome', 'Back to home')}</Link>
                    </Button>
                    {claim.status === 'rejected' && (
                        <Button asChild className="flex-1">
                            <Link href="/pro/signup">{t('dashboardPendingPage.actions.tryAgain', 'Try again')}</Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
