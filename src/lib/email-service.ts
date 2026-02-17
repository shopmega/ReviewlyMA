/**
 * Email Service
 * Centralized email sending with support for multiple providers
 * Supports: Resend, SendGrid, AWS SES, or console fallback
 */

import { logger } from './logger';
import { ActionState } from './types';
import { getSiteSettings } from './data';
import { getFromEmail } from './site-config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailTemplate {
  subject: string;
  html: (data: any) => string;
  text?: (data: any) => string;
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<ActionState> {
  // Try to get settings from database first, fallback to environment variables
  let dbSettings;
  try {
    dbSettings = await getSiteSettings();
  } catch (error) {
    logger.warn('Could not fetch site settings, using environment variables', error instanceof Error ? { message: error.message } : { error });
    dbSettings = null;
  }

  const emailProvider = dbSettings?.email_provider || process.env.EMAIL_PROVIDER || 'console';
  const fromEmail = options.from || getFromEmail(dbSettings);
  // Prefer environment variables for secrets in production, fallback to DB settings.
  const resendApiKey = process.env.RESEND_API_KEY || dbSettings?.resend_api_key;
  const sendgridApiKey = process.env.SENDGRID_API_KEY || dbSettings?.sendgrid_api_key;
  const mailjetApiKey = process.env.MAILJET_API_KEY || dbSettings?.mailjet_api_key;
  const mailjetApiSecret = process.env.MAILJET_API_SECRET || dbSettings?.mailjet_api_secret;

  try {
    switch (emailProvider) {
      case 'resend':
        return await sendWithResend({ ...options, from: fromEmail }, resendApiKey || '');

      case 'sendgrid':
        return await sendWithSendGrid({ ...options, from: fromEmail }, sendgridApiKey || '');

      case 'mailjet':
        return await sendWithMailjet({ ...options, from: fromEmail }, mailjetApiKey || '', mailjetApiSecret || '');

      case 'ses':
        return await sendWithSES({ ...options, from: fromEmail });

      case 'console':
      default:
        return await sendWithConsole(options);
    }
  } catch (error) {
    logger.error('Email sending failed', error instanceof Error ? { message: error.message, to: options.to, subject: options.subject } : { error, to: options.to, subject: options.subject });
    return {
      status: 'error',
      message: 'Failed to send email. Please try again later.',
    };
  }
}

/**
 * Send email using Resend
 */
async function sendWithResend(options: EmailOptions, apiKey: string): Promise<ActionState> {
  if (!apiKey) {
    logger.warn('Resend API key not configured, falling back to console');
    return await sendWithConsole(options);
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Resend API error');
    }

    const data = await response.json();
    logger.info('Email sent via Resend', { emailId: data.id, to: options.to });

    return {
      status: 'success',
      message: 'Email sent successfully',
      data: { emailId: data.id },
    };
  } catch (error) {
    logger.error('Resend email error', error);
    throw error;
  }
}

/**
 * Send email using SendGrid
 */
async function sendWithSendGrid(options: EmailOptions, apiKey: string): Promise<ActionState> {
  if (!apiKey) {
    logger.warn('SendGrid API key not configured, falling back to console');
    return await sendWithConsole(options);
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.from },
        subject: options.subject,
        content: [
          { type: 'text/html', value: options.html },
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'SendGrid API error');
    }

    logger.info('Email sent via SendGrid', { to: options.to });

    return {
      status: 'success',
      message: 'Email sent successfully',
    };
  } catch (error) {
    logger.error('SendGrid email error', error);
    throw error;
  }
}

/**
 * Send email using Mailjet
 */
async function sendWithMailjet(options: EmailOptions, apiKey: string, apiSecret: string): Promise<ActionState> {
  if (!apiKey || !apiSecret) {
    logger.warn('Mailjet API key or secret not configured, falling back to console');
    return await sendWithConsole(options);
  }

  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: options.from },
            To: [{ Email: options.to }],
            Subject: options.subject,
            HTMLPart: options.html,
            TextPart: options.text,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Mailjet API error');
    }

    const data = await response.json();
    const firstMessage = data?.Messages?.[0];
    const firstRecipient = firstMessage?.To?.[0];
    const mailjetId =
      firstRecipient?.MessageID ||
      firstRecipient?.MessageUUID ||
      firstMessage?.MessageID ||
      null;

    logger.info('Email sent via Mailjet', { emailId: mailjetId, to: options.to });

    return {
      status: 'success',
      message: 'Email sent successfully',
      data: { emailId: mailjetId },
    };
  } catch (error) {
    logger.error('Mailjet email error', error);
    throw error;
  }
}

/**
 * Send email using AWS SES
 */
async function sendWithSES(options: EmailOptions): Promise<ActionState> {
  // AWS SES implementation would go here
  // Requires @aws-sdk/client-ses package
  logger.warn('AWS SES not yet implemented, falling back to console');
  return await sendWithConsole(options);
}

/**
 * Console fallback for development
 */
async function sendWithConsole(options: EmailOptions): Promise<ActionState> {
  logger.info('📧 [EMAIL]', {
    to: options.to,
    subject: options.subject,
    from: options.from,
    provider: 'console',
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('\n--- EMAIL CONTENT ---');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`From: ${options.from}`);
    console.log('\nHTML Content:');
    console.log(options.html);
    if (options.text) {
      console.log('\nText Content:');
      console.log(options.text);
    }
    console.log('--- END EMAIL ---\n');
  }

  return {
    status: 'success',
    message: 'Email logged to console (development mode)',
  };
}

/**
 * Email templates
 */
export const emailTemplates = {
  claimApproval: {
    subject: (businessName: string) => `Revendication approuvée - ${businessName}`,
    html: (data: { userName: string; businessName: string; siteName: string; siteUrl: string; contactEmail: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Revendication Approuvée ✓</h1>
            <p>Félicitations ${data.userName}!</p>
        </div>
        <div class="content">
            <p>Bonne nouvelle! Votre revendication pour l'établissement <strong>"${data.businessName}"</strong> a été approuvée par notre équipe d'administration sur ${data.siteName}.</p>
            <a href="${data.siteUrl}/login" class="button">Accéder à mon tableau de bord</a>
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Questions? Contactez-nous à <strong>${data.contactEmail}</strong>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.siteName} - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
    `,
  },
  verificationCode: {
    subject: (code: string, siteName: string = 'Platform') => `Votre code de vérification ${siteName} : ${code}`,
    html: (data: { code: string; siteName: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 40px; text-align: center; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .code-display { 
            font-size: 42px; 
            font-weight: 800; 
            letter-spacing: 8px; 
            color: #4f46e5; 
            background: #fff; 
            border: 2px dashed #e5e7eb; 
            padding: 20px; 
            border-radius: 12px; 
            margin: 30px 0;
            display: inline-block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Vérification de compte</h1>
        </div>
        <div class="content">
            <p>Utilisez le code ci-dessous pour vérifier votre demande de revendication sur <strong>${data.siteName}</strong> :</p>
            <div class="code-display">${data.code}</div>
            <p style="color: #6b7280; font-size: 14px;">Ce code expirera dans 24 heures.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.siteName} - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
    `,
  },
  supportResponse: {
    subject: (ticketSubject: string) => `Réponse à votre ticket : ${ticketSubject}`,
    html: (data: { userName: string; ticketSubject: string; adminMessage: string; siteName: string; siteUrl: string }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .response-box { background: white; border-left: 4px solid #4f46e5; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4f46e5; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nouvelle réponse au ticket</h1>
        </div>
        <div class="content">
            <p>Bonjour ${data.userName},</p>
            <p>Un administrateur a répondu à votre ticket concernant : <strong>"${data.ticketSubject}"</strong>.</p>
            <div class="response-box">
                <p style="white-space: pre-wrap; margin: 0;">${data.adminMessage}</p>
            </div>
            <a href="${data.siteUrl}/dashboard/support" class="button">Voir la discussion complète</a>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.siteName} - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
    `,
  },
};



