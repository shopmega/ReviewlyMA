'use server';

import { ActionState } from "@/lib/types";
import { getSiteSettings } from "@/lib/data";
import { sendEmail, emailTemplates } from "@/lib/email-service";
import { logger } from "@/lib/logger";

// Simple email service - you can replace with SendGrid, Resend, etc.
export async function sendClaimApprovalEmail(
    userEmail: string,
    userName: string,
    businessName: string
): Promise<ActionState> {
    try {
        const settings = await getSiteSettings();
        const siteName = settings.site_name || 'Platform';
        const contactEmail = settings.contact_email || 'support@example.com';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

        // Email template
        const htmlContent = `
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
        .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Revendication Approuvée ✓</h1>
            <p>Félicitations ${userName}!</p>
        </div>
        <div class="content">
            <p>Bonne nouvelle! Votre revendication pour l'établissement <strong>"${businessName}"</strong> a été approuvée par notre équipe d'administration sur ${siteName}.</p>
            
            <h2 style="color: #111827; margin-top: 24px;">Ce que vous pouvez faire maintenant:</h2>
            <ul style="line-height: 1.8; color: #374151;">
                <li>✅ Accéder à votre tableau de bord professionnel</li>
                <li>✅ Gérer les avis et répondre aux clients</li>
                <li>✅ Publier des mises à jour et annonces</li>
                <li>✅ Éditer les informations de votre établissement</li>
                <li>✅ Consulter les statistiques et analytiques</li>
                <li>✅ Intégrer le widget d'avis sur votre site</li>
            </ul>
            
            <a href="${siteUrl}/login" class="button">Accéder à mon tableau de bord</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Si vous avez des questions, n'hésitez pas à nous contacter à <strong>${contactEmail}</strong>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${siteName} - Tous droits réservés</p>
            <p>Vous recevez cet email car vous avez soumis une revendication sur ${siteName}</p>
        </div>
    </div>
</body>
</html>
        `;

        // Send email using email service
        const result = await sendEmail({
          to: userEmail,
          subject: emailTemplates.claimApproval.subject(businessName),
          html: emailTemplates.claimApproval.html({
            userName,
            businessName,
            siteName,
            siteUrl,
            contactEmail,
          }),
        });

        if (result.status === 'error') {
          logger.error('Failed to send claim approval email', undefined, { userEmail, businessName });
        }

        return result;
    } catch (error) {
        logger.error('Email service error', error, { userEmail });
        return { status: 'error', message: 'Une erreur est survenue lors de l\'envoi de l\'email.' };
    }
}

export async function sendClaimRejectionEmail(
    userEmail: string,
    userName: string,
    businessName: string,
    reason?: string
): Promise<ActionState> {
    try {
        const settings = await getSiteSettings();
        const siteName = settings.site_name || 'Platform';
        const contactEmail = settings.contact_email || 'support@example.com';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f93b1d 0%, #ea1e63 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Revendication Non Approuvée</h1>
            <p>Détails importants concernant votre demande sur ${siteName}</p>
        </div>
        <div class="content">
            <p>Bonjour ${userName},</p>
            
            <p>Après examen, nous ne pouvons pas approuver votre revendication pour l'établissement <strong>"${businessName}"</strong>.</p>
            
            ${reason ? `
            <div class="warning-box">
                <strong>Raison :</strong>
                <p>${reason}</p>
            </div>
            ` : ''}
            
            <h2 style="color: #111827; margin-top: 24px;">Que faire maintenant?</h2>
            <ul style="line-height: 1.8; color: #374151;">
                <li>📧 Vérifiez que vos informations sont correctes</li>
                <li>📝 Vous pouvez soumettre une nouvelle revendication</li>
                <li>💬 Contactez notre support si vous avez des questions</li>
            </ul>
            
            <a href="${siteUrl}/pour-les-pros" class="button">Soumettre une nouvelle demande</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Questions? Contactez-nous à <strong>${contactEmail}</strong>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${siteName} - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
        `;

        const result = await sendEmail({
          to: userEmail,
          subject: `Revendication non approuvée - ${businessName}`,
          html: htmlContent,
        });

        if (result.status === 'error') {
          logger.error('Failed to send claim rejection email', undefined, { userEmail, businessName });
        }

        return result;
    } catch (error) {
        logger.error('Email service error (claim rejection)', error, { userEmail });
        return { status: 'error', message: 'Une erreur est survenue lors de l\'envoi de l\'email.' };
    }
}

export async function sendPremiumActivationEmail(
    userEmail: string,
    userName: string
): Promise<ActionState> {
    try {
        const settings = await getSiteSettings();
        const siteName = settings.site_name || 'Platform';
        const contactEmail = settings.contact_email || 'support@example.com';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #f59e0b; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .premium-badge { display: inline-block; background: #fbbf24; color: #92400e; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bienvenue dans Avis Premium! ★</h1>
            <p>Félicitations ${userName}!</p>
        </div>
        <div class="content">
            <div style="text-align: center; margin-bottom: 20px;">
                <span class="premium-badge">Membre Premium Activé</span>
            </div>
            <p>Nous avons le plaisir de vous annoncer que votre statut <strong>Premium</strong> a été activé avec succès sur ${siteName}.</p>
            
            <h2 style="color: #111827; margin-top: 24px;">Vos nouveaux avantages exclusifs:</h2>
            <ul style="line-height: 1.8; color: #374151;">
                <li>🌟 <strong>Visibilité prioritaire</strong> dans les résultats de recherche</li>
                <li>🏅 <strong>Badge de confiance PRO</strong> sur votre profil</li>
                <li>💬 <strong>Messagerie directe</strong> activée avec vos clients</li>
                <li>📊 <strong>Analytiques avancées</strong> pour suivre vos performances</li>
                <li>✨ <strong>Profil sans publicité</strong> tiers</li>
            </ul>
            
            <a href="${siteUrl}/dashboard" class="button">Accéder à mes avantages</a>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Des questions sur vos nouvelles fonctionnalités ? Contactez-nous à <strong>${contactEmail}</strong>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${siteName} - L'excellence au service de votre établissement</p>
        </div>
    </div>
</body>
</html>
        `;

        const result = await sendEmail({
          to: userEmail,
          subject: 'Votre statut Premium est activé ! ★',
          html: htmlContent,
        });

        if (result.status === 'error') {
          logger.error('Failed to send premium activation email', undefined, { userEmail });
        }

        return result;
    } catch (error) {
        logger.error('Email service error (premium activation)', error, { userEmail });
        return { status: 'error', message: 'Une erreur est survenue lors de l\'envoi de l\'email.' };
    }
}

export async function sendPremiumRejectionEmail(
    userEmail: string,
    userName: string,
    reason: string
): Promise<ActionState> {
    try {
        const settings = await getSiteSettings();
        const siteName = settings.site_name || 'Platform';
        const contactEmail = settings.contact_email || 'support@example.com';

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
        .reason-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Paiement Premium Non Validé</h1>
        </div>
        <div class="content">
            <p>Bonjour ${userName},</p>
            <p>Nous n'avons pas pu valider votre paiement pour l'offre Premium sur ${siteName}.</p>
            
            <div class="reason-box">
                <strong>Motif du refus :</strong>
                <p>${reason}</p>
            </div>
            
            <p>Si vous pensez qu'il s'agit d'une erreur, vous pouvez soumettre à nouveau votre demande avec les informations correctes ou nous contacter directement.</p>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Support : <strong>${contactEmail}</strong>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${siteName}</p>
        </div>
    </div>
</body>
</html>
        `;

        const result = await sendEmail({
          to: userEmail,
          subject: 'Problème concernant votre paiement Premium',
          html: htmlContent,
        });

        if (result.status === 'error') {
          logger.error('Failed to send premium rejection email', undefined, { userEmail });
        }

        return result;
    } catch (error) {
        logger.error('Email service error (premium rejection)', error, { userEmail });
        return { status: 'error', message: 'Une erreur est survenue lors de l\'envoi de l\'email.' };
    }
}
