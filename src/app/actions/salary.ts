'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { salarySubmissionSchema, ActionState } from '@/lib/types';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';
import { getSiteSettings } from '@/lib/data';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  handleValidationError,
  ErrorCode,
  logError,
} from '@/lib/errors';
import { slugify } from '@/lib/utils';

export type SalaryFormState = ActionState;

function deriveSeniorityLevel(yearsExperience?: number) {
  if (typeof yearsExperience !== 'number') return null;
  if (yearsExperience <= 2) return 'junior';
  if (yearsExperience <= 5) return 'confirme';
  if (yearsExperience <= 10) return 'senior';
  return 'expert';
}

export async function submitSalary(
  prevState: SalaryFormState,
  formData: FormData
): Promise<SalaryFormState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createErrorResponse(
      ErrorCode.AUTHENTICATION_ERROR,
      'Vous devez être connecté pour soumettre un salaire.'
    ) as SalaryFormState;
  }

  const rateLimitKey = `salary-submit-${user.id}`;
  const { isLimited, retryAfterSeconds } = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIG.review);
  if (isLimited) {
    return createErrorResponse(
      ErrorCode.RATE_LIMIT_ERROR,
      `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfterSeconds / 60)} minutes.`
    ) as SalaryFormState;
  }

  const entries = Object.fromEntries(formData.entries());
  const hasBonusInput = (
    entries.bonusPrime !== undefined
    || entries.bonusTreiziemeMois !== undefined
    || entries.bonusCommission !== undefined
    || entries.bonusAnnuel !== undefined
  );

  const parsed = salarySubmissionSchema.safeParse({
    businessId: entries.businessId,
    jobTitle: entries.jobTitle,
    salary: entries.salary,
    payPeriod: entries.payPeriod,
    employmentType: entries.employmentType,
    location: entries.location || undefined,
    yearsExperience: entries.yearsExperience === '' ? undefined : entries.yearsExperience,
    seniorityLevel: entries.seniorityLevel || undefined,
    department: entries.department || undefined,
    workModel: entries.workModel || undefined,
    bonusFlags: hasBonusInput ? {
      prime: entries.bonusPrime === 'true',
      treizieme_mois: entries.bonusTreiziemeMois === 'true',
      commission: entries.bonusCommission === 'true',
      bonus_annuel: entries.bonusAnnuel === 'true',
    } : undefined,
    isCurrent: entries.isCurrent === 'true',
  });

  if (!parsed.success) {
    return handleValidationError(
      'Veuillez corriger les erreurs du formulaire salaire.',
      parsed.error.flatten().fieldErrors
    ) as SalaryFormState;
  }

  const payload = parsed.data;
  const seniorityLevel = payload.seniorityLevel || deriveSeniorityLevel(payload.yearsExperience);
  const bonusFlags = payload.bonusFlags || {
    prime: false,
    treizieme_mois: false,
    commission: false,
    bonus_annuel: false,
  };
  const settings = await getSiteSettings();
  const allowedRoles = (settings.salary_roles || []).map((value) => value.trim()).filter(Boolean);
  const allowedDepartments = (settings.salary_departments || []).map((value) => value.trim()).filter(Boolean);
  const configuredIntervals = Array.isArray(settings.salary_intervals) ? settings.salary_intervals : [];

  if (allowedRoles.length > 0 && !allowedRoles.includes(payload.jobTitle)) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Poste invalide. Veuillez selectionner un poste propose.'
    ) as SalaryFormState;
  }

  if (payload.department && allowedDepartments.length > 0 && !allowedDepartments.includes(payload.department)) {
    return createErrorResponse(
      ErrorCode.VALIDATION_ERROR,
      'Departement invalide. Veuillez selectionner un departement propose.'
    ) as SalaryFormState;
  }

  if (configuredIntervals.length > 0) {
    const withinAnyInterval = configuredIntervals.some((interval: any) => {
      const min = Number(interval?.min);
      const max = Number(interval?.max);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
      return payload.salary >= min && payload.salary <= max;
    });

    if (!withinAnyInterval) {
      return createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Montant de salaire invalide. Veuillez choisir un montant dans les intervalles autorises.'
      ) as SalaryFormState;
    }
  }

  const { data: businessRow, error: businessError } = await supabase
    .from('businesses')
    .select('city')
    .eq('id', payload.businessId)
    .maybeSingle();

  if (businessError) {
    logError('submit_salary_business_city_lookup', businessError, { businessId: payload.businessId, userId: user.id });
  }

  const normalizedBusinessCity = businessRow?.city?.trim() || null;

  const row = {
    business_id: payload.businessId,
    user_id: user.id,
    job_title: payload.jobTitle,
    salary: payload.salary,
    location: normalizedBusinessCity,
    pay_period: payload.payPeriod,
    currency: 'MAD',
    employment_type: payload.employmentType,
    years_experience: payload.yearsExperience ?? null,
    seniority_level: seniorityLevel,
    department: payload.department || null,
    work_model: payload.workModel || null,
    bonus_flags: bonusFlags,
    is_current: payload.isCurrent,
    source: 'self_reported',
    status: 'pending',
  };

  const { error } = await supabase.from('salaries').insert(row);
  if (error) {
    logError('submit_salary_insert', error, { businessId: payload.businessId, userId: user.id });
    return handleDatabaseError(error) as SalaryFormState;
  }

  revalidatePath(`/businesses/${payload.businessId}`);
  return createSuccessResponse(
    'Salaire soumis avec succès. Il sera publié après modération.'
  ) as SalaryFormState;
}

export async function moderateSalary(
  salaryId: number,
  status: 'published' | 'rejected',
  moderationNotes?: string
): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, 'Non autorisé') as ActionState;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return createErrorResponse(ErrorCode.AUTHORIZATION_ERROR, 'Réservé aux administrateurs.') as ActionState;
    }

    const service = await createServiceClient();
    const { data: salary, error: fetchError } = await service
      .from('salaries')
      .select('business_id, user_id, job_title, location, sector_slug')
      .eq('id', salaryId)
      .single();

    if (fetchError || !salary) {
      return createErrorResponse(ErrorCode.NOT_FOUND, 'Entrée salaire introuvable.') as ActionState;
    }

    const { error } = await service
      .from('salaries')
      .update({
        status,
        moderation_notes: moderationNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', salaryId);

    if (error) {
      return handleDatabaseError(error) as ActionState;
    }

    if (status === 'published') {
      // Keep salary comparison analytics fresh right after moderation.
      const { error: refreshError } = await service.rpc('refresh_salary_analytics_materialized_views');
      if (refreshError) {
        logError('moderate_salary_refresh_analytics', refreshError, { salaryId, businessId: salary.business_id });
      }

      // Notify users subscribed to salary updates for this scope.
      const roleSlug = salary.job_title ? slugify(salary.job_title) : null;
      const citySlug = salary.location ? slugify(salary.location) : null;

      const [companySubs, roleCitySubs, sectorCitySubs] = await Promise.all([
        service
          .from('salary_alert_subscriptions')
          .select('user_id')
          .eq('scope', 'company')
          .eq('business_id', salary.business_id),
        roleSlug && citySlug
          ? service
              .from('salary_alert_subscriptions')
              .select('user_id')
              .eq('scope', 'role_city')
              .eq('role_slug', roleSlug)
              .eq('city_slug', citySlug)
          : Promise.resolve({ data: [], error: null }),
        salary.sector_slug && citySlug
          ? service
              .from('salary_alert_subscriptions')
              .select('user_id')
              .eq('scope', 'sector_city')
              .eq('sector_slug', salary.sector_slug)
              .eq('city_slug', citySlug)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (companySubs.error) {
        logError('moderate_salary_subscribers_company', companySubs.error, { salaryId, businessId: salary.business_id });
      }
      if (roleCitySubs.error) {
        logError('moderate_salary_subscribers_role_city', roleCitySubs.error, { salaryId, roleSlug, citySlug });
      }
      if (sectorCitySubs.error) {
        logError('moderate_salary_subscribers_sector_city', sectorCitySubs.error, { salaryId, sectorSlug: salary.sector_slug, citySlug });
      }

      const notificationsByUser = new Map<string, { title: string; message: string; link: string }>();

      const companyLink = `/businesses/${salary.business_id}?tab=salaries#salaries`;
      const roleLink = roleSlug && citySlug ? `/salaires/role/${roleSlug}/${citySlug}` : companyLink;
      const sectorLink = salary.sector_slug && citySlug ? `/salaires/secteur/${salary.sector_slug}/${citySlug}` : companyLink;
      const roleName = salary.job_title || 'ce poste';
      const cityName = salary.location || 'votre ville';

      (companySubs.data || []).forEach((row: any) => {
        if (!row.user_id) return;
        notificationsByUser.set(row.user_id, {
          title: 'Nouvelle publication salaire',
          message: 'Un nouveau salaire a ete publie pour une entreprise que vous suivez.',
          link: companyLink,
        });
      });

      (roleCitySubs.data || []).forEach((row: any) => {
        if (!row.user_id) return;
        notificationsByUser.set(row.user_id, {
          title: `Mise a jour salaire: ${roleName}`,
          message: `Nouveau salaire publie pour ${roleName} a ${cityName}.`,
          link: roleLink,
        });
      });

      (sectorCitySubs.data || []).forEach((row: any) => {
        if (!row.user_id) return;
        notificationsByUser.set(row.user_id, {
          title: 'Mise a jour salaire secteur',
          message: `Nouveau salaire publie dans un secteur suivi a ${cityName}.`,
          link: sectorLink,
        });
      });

      const notificationsPayload = Array.from(notificationsByUser.entries())
        .filter(([userId]) => userId !== salary.user_id)
        .map(([userId, payload]) => ({
          user_id: userId,
          title: payload.title,
          message: payload.message,
          type: 'salary_update',
          link: payload.link,
          is_read: false,
        }));

      if (notificationsPayload.length > 0) {
        const { error: notifyError } = await service.from('notifications').insert(notificationsPayload);
        if (notifyError) {
          logError('moderate_salary_notify_subscribers', notifyError, { salaryId, count: notificationsPayload.length });
        }
      }
    }

    revalidatePath(`/businesses/${salary.business_id}`);
    return createSuccessResponse('Statut salaire mis à jour.') as ActionState;
  } catch (error) {
    logError('moderate_salary_unexpected', error);
    return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur inattendue.') as ActionState;
  }
}
