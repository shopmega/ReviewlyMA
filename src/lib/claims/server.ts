import { sendEmail, emailTemplates } from '@/lib/email-service';
import { getSiteSettings } from '@/lib/data';
import { getSiteName } from '@/lib/site-config';

type SupabaseLikeClient = {
  from: (table: string) => any;
};

export async function createClaimVerificationCodeRecord(input: {
  supabase: SupabaseLikeClient;
  claimId: string;
  method: 'email' | 'phone';
  expiresInHours?: number;
  replaceExisting?: boolean;
}) {
  const { supabase, claimId, method, expiresInHours = 24, replaceExisting = false } = input;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

  if (replaceExisting) {
    await supabase
      .from('verification_codes')
      .delete()
      .eq('claim_id', claimId)
      .eq('method', method);
  }

  const { error } = await supabase.from('verification_codes').insert([
    {
      claim_id: claimId,
      method,
      code,
      verified: false,
      expires_at: expiresAt,
    },
  ]);

  if (error) {
    throw new Error(error.message || 'Failed to create verification code');
  }

  return { code, expiresAt };
}

export async function sendClaimEmailVerificationCode(input: {
  email: string;
  code: string;
}) {
  const settings = await getSiteSettings();
  const siteName = getSiteName(settings);

  await sendEmail({
    to: input.email,
    subject: emailTemplates.verificationCode.subject(input.code),
    html: emailTemplates.verificationCode.html({ code: input.code, siteName }),
  });
}
