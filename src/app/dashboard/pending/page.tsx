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

    useEffect(() => {
        const fetchClaimStatus = async () => {
            try {
                const supabase = createClient();
                
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) {
                    console.error('Auth error:', authError);
                    setError('Authentication error');
                    setLoading(false);
                    return;
                }
                if (!user) {
                    console.log('No user found');
                    router.push('/login');
                    return;
                }

                console.log('Fetching claim for user:', user.id);

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
                    setError('Error loading claim: ' + claimError.message);
                    setLoading(false);
                    return;
                }

                if (!claims || claims.length === 0) {
                    console.log('No claims found');
                    router.push('/');
                    return;
                }

                const userClaim = claims[0];
                console.log('Claim loaded:', userClaim);
                
                if (userClaim.status === 'approved') {
                    console.log('Claim approved, updating profile');
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
                        } else {
                            console.log('User already has a business, skipping profile update');
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
                setError('Error: ' + (err?.message || 'Unknown error'));
                setLoading(false);
            }
        };

        fetchClaimStatus();
    }, [router]);

    const handleVerifyCode = async (method: string) => {
        if (!verificationCode.trim()) {
            toast({ title: 'Error', description: 'Please enter the verification code.', variant: 'destructive' });
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
                toast({ title: 'Error', description: 'Invalid or expired code.', variant: 'destructive' });
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

            toast({ title: 'Success', description: `${method} verified successfully!` });
            setVerificationCode('');
            setVerifyingMethod(null);
            
            if (claim) {
                setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
            }
        } catch (err: any) {
            console.error('Verification error:', err);
            toast({ title: 'Error', description: 'Verification failed. Please try again.', variant: 'destructive' });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDocumentUpload = async (file: File) => {
        if (!file || !claim) return;
        if (file.size > 10 * 1024 * 1024) {
            toast({ title: 'Error', description: 'File too large (max 10MB)', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();
            
            const ext = file.name.split('.').pop() || 'pdf';
            const docPath = `claims/${claim.id}/document-${Date.now()}.${ext}`;
            
            console.log('Document upload starting:', { path: docPath, size: file.size, type: file.type });
            
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('claim-proofs')
                .upload(docPath, file);

            console.log('Upload response:', { uploadError, uploadData });
            
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
            
            console.log('Updating claim with:', { newProofStatus, newProofData });
            
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

            toast({ title: 'Success', description: 'Document uploaded. Our team will review it.' });
            setUploadedFiles(prev => ({ ...prev, document: file }));
            setVerifyingMethod(null);
            setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
        } catch (err: any) {
            console.error('Document upload error:', err);
            console.error('Error details:', {
                message: err?.message,
                cause: err?.cause,
            });
            toast({ title: 'Error', description: err?.message || 'Upload failed. Please try again.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleVideoUpload = async (file: File) => {
        if (!file || !claim) return;
        if (file.size > 100 * 1024 * 1024) {
            toast({ title: 'Error', description: 'Video too large (max 100MB)', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        try {
            const supabase = createClient();
            
            const ext = file.name.split('.').pop() || 'mp4';
            const vidPath = `claims/${claim.id}/video-${Date.now()}.${ext}`;
            
            console.log('Video upload starting:', { path: vidPath, size: file.size, type: file.type });
            
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('claim-proofs')
                .upload(vidPath, file);

            console.log('Upload response:', { uploadError, uploadData });
            
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
            
            console.log('Updating claim with:', { newProofStatus, newProofData });
            
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

            toast({ title: 'Success', description: 'Video uploaded. Our team will review it.' });
            setUploadedFiles(prev => ({ ...prev, video: file }));
            setVerifyingMethod(null);
            setClaim({ ...claim, proof_status: newProofStatus, proof_data: newProofData });
        } catch (err: any) {
            console.error('Video upload error:', err);
            console.error('Error details:', {
                message: err?.message,
                cause: err?.cause,
            });
            toast({ title: 'Error', description: err?.message || 'Upload failed. Please try again.', variant: 'destructive' });
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
                    <p className="font-medium capitalize">{method}</p>
                    <p className={`text-xs ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {isVerified ? (status === 'pending_review' ? 'In review' : 'Verified') : 'Pending verification'}
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
                        <CardTitle>Loading...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="animate-pulse">Please wait</div>
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
                            Error
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <p className="text-xs text-muted-foreground mb-4">Check browser console for details</p>
                        <Button asChild className="w-full">
                            <Link href="/login">Back to login</Link>
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
                        <CardTitle>No claim found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            You don't have a pending claim. Please create a pro account first.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/pour-les-pros/signup">Create pro account</Link>
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
                                            ? 'Claim pending approval'
                                            : claim.status === 'rejected'
                                            ? 'Claim rejected'
                                            : 'Processing'}
                                    </CardTitle>
                                    <CardDescription className="text-amber-800 mt-1">
                                        {claim.status === 'pending' &&
                                            'Your claim is pending review by our moderators. This usually takes 24-48 hours.'}
                                        {claim.status === 'rejected' &&
                                            'Your claim was rejected. Please verify the information and try again.'}
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Claim details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Business</p>
                                <p className="text-lg font-semibold">{business?.name || 'Loading...'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                <p className="text-lg font-semibold capitalize">
                                    {claim.status === 'pending' && (
                                        <span className="text-amber-600">Pending</span>
                                    )}
                                    {claim.status === 'approved' && (
                                        <span className="text-green-600">Approved</span>
                                    )}
                                    {claim.status === 'rejected' && (
                                        <span className="text-red-600">Rejected</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Your name</p>
                                <p className="text-lg font-semibold">{claim.full_name}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Your title</p>
                                <p className="text-lg font-semibold">{claim.job_title}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-lg font-semibold">{claim.email}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Date</p>
                                <p className="text-lg font-semibold">
                                    {new Date(claim.created_at).toLocaleDateString('en-US', {
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
                                Identity verification
                            </CardTitle>
                            <CardDescription className="text-blue-900">
                                Complete verification to speed up approval
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
                                                            <Label htmlFor={`code-${method}`} className="text-sm">Verification code (6 digits)</Label>
                                                            <p className="text-xs text-muted-foreground mb-2">Check your email {claim.email}</p>
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
                                                            <Label htmlFor={`code-${method}`} className="text-sm">SMS code (6 digits)</Label>
                                                            <p className="text-xs text-muted-foreground mb-2">Check your SMS messages</p>
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
                                                                <p className="text-sm font-medium">Upload document</p>
                                                                <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
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
                                                                <p className="text-sm font-medium">Upload video</p>
                                                                <p className="text-xs text-muted-foreground">MP4, WebM (max 100MB)</p>
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
                                                    Verify now
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
                        <CardTitle>Next steps</CardTitle>
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
                                            <p className="font-medium">1. Complete verification</p>
                                            <p className="text-sm text-muted-foreground">Verify above, then our team reviews</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">2. Approval</p>
                                    <p className="text-sm text-muted-foreground">You'll get a confirmation email</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <CheckCircle2 className="h-3 w-3 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">3. Dashboard access</p>
                                    <p className="text-sm text-muted-foreground">Manage reviews and more</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg mt-6">
                            <p className="text-sm text-muted-foreground mb-2">
                                <strong>Tip:</strong> Check your email (including spam) for important notifications.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button asChild variant="outline" className="flex-1">
                        <Link href="/">Back to home</Link>
                    </Button>
                    {claim.status === 'rejected' && (
                        <Button asChild className="flex-1">
                            <Link href="/pour-les-pros/signup">Try again</Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
