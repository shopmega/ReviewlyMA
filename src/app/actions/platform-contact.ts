'use server';

import { ActionState } from "@/lib/types";
import { getSiteSettings } from "@/lib/data";

export async function submitContactForm(
    formData: FormData
): Promise<ActionState> {
    try {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const subject = formData.get('subject') as string;
        const message = formData.get('message') as string;

        if (!email || !message) {
            return {
                status: 'error',
                message: 'Veuillez remplir tous les champs obligatoires (Email et Message).'
            };
        }

        const settings = await getSiteSettings();
        const siteName = settings.site_name || 'Platform';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #374151; font-size: 14px; }
        .value { color: #1f2937; margin-top: 4px; padding: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nouveau message de contact</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Nom</div>
                <div class="value">${name || 'Non renseigné'}</div>
            </div>
            <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="field">
                <div class="label">Sujet</div>
                <div class="value">${subject || 'Aucun sujet'}</div>
            </div>
            <div class="field">
                <div class="label">Message</div>
                <div class="value" style="white-space: pre-wrap;">${message}</div>
            </div>
        </div>
        <div class="footer">
            <p>Ce message a été envoyé via le formulaire de contact de ${siteName}</p>
        </div>
    </div>
</body>
</html>
        `;

        const { sendEmail } = await import('@/lib/email-service');

        const emailResult = await sendEmail({
            to: settings.email_from || process.env.EMAIL_FROM || 'admin@avis.ma',
            subject: `[Contact] ${subject || 'Nouveau message'} - ${name || 'Utilisateur'}`,
            html: htmlContent,
        });

        if (emailResult.status === 'error') {
            console.error('Failed to send contact email:', emailResult.message);
            // Still return success to user for better UX, but log error internally
        }

        return { status: 'success', message: 'Votre message a été envoyé avec succès !' };
    } catch (error) {
        console.error('Contact form error:', error);
        return { status: 'error', message: 'Une erreur est survenue lors de l\'envoi du message.' };
    }
}
