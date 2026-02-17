'use server';

import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { salarySubmissionSchema, ActionState } from '@/lib/types';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rate-limiter';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  handleValidationError,
  ErrorCode,
  logError,
} from '@/lib/errors';

export type SalaryFormState = ActionState;

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
  const parsed = salarySubmissionSchema.safeParse({
    businessId: entries.businessId,
    jobTitle: entries.jobTitle,
    salary: entries.salary,
    payPeriod: entries.payPeriod,
    employmentType: entries.employmentType,
    location: entries.location || undefined,
    yearsExperience: entries.yearsExperience === '' ? undefined : entries.yearsExperience,
    department: entries.department || undefined,
    isCurrent: entries.isCurrent === 'true',
  });

  if (!parsed.success) {
    return handleValidationError(
      'Veuillez corriger les erreurs du formulaire salaire.',
      parsed.error.flatten().fieldErrors
    ) as SalaryFormState;
  }

  const payload = parsed.data;
  const row = {
    business_id: payload.businessId,
    user_id: user.id,
    job_title: payload.jobTitle,
    salary: payload.salary,
    location: payload.location || null,
    pay_period: payload.payPeriod,
    currency: 'MAD',
    employment_type: payload.employmentType,
    years_experience: payload.yearsExperience ?? null,
    department: payload.department || null,
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
      .select('business_id')
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

    revalidatePath(`/businesses/${salary.business_id}`);
    return createSuccessResponse('Statut salaire mis à jour.') as ActionState;
  } catch (error) {
    logError('moderate_salary_unexpected', error);
    return createErrorResponse(ErrorCode.SERVER_ERROR, 'Erreur inattendue.') as ActionState;
  }
}
