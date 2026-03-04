'use server';

import { createAdminClient, verifyAdminSession } from '@/lib/supabase/admin';

export type OpportunityAction = 'outreach' | 'upgrade' | 'monitor';

export interface AdminOpportunity {
  business_id: string;
  name: string;
  city: string | null;
  category: string | null;
  tier: string | null;
  is_premium: boolean;
  is_claimed: boolean;
  views_30d: number;
  leads_30d: number;
  saves_30d: number;
  reviews_30d: number;
  avg_rating_30d: number;
  lead_rate_30d: number;
  traction_score: number;
  reputation_score: number;
  intent_score: number;
  upgrade_score: number;
  acquisition_score: number;
  recommended_action: OpportunityAction;
  last_signal_at: string | null;
}

export interface OpportunityFilters {
  search?: string;
  city?: string;
  category?: string;
  claimed?: 'all' | 'claimed' | 'unclaimed';
  action?: 'all' | OpportunityAction;
  limit?: number;
  page?: number;
}

export interface OpportunityResult {
  data: AdminOpportunity[];
  count: number;
  warning?: string;
}

export type OutreachStage = 'new' | 'contacted' | 'interested' | 'claimed' | 'upgraded' | 'lost';
export type OutreachPriority = 'low' | 'medium' | 'high';
export type OutreachChannel = 'email' | 'phone' | 'linkedin' | 'whatsapp' | 'other';

export interface OutreachLeadInput {
  businessId: string;
  stage?: OutreachStage;
  priority?: OutreachPriority;
  source?: 'admin-opportunity' | 'manual' | 'import';
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactChannel?: OutreachChannel | null;
  notes?: string | null;
  ownerAdminId?: string | null;
  nextFollowUpAt?: string | null;
}

export interface OutreachLeadRecord {
  id: string;
  business_id: string;
  stage: OutreachStage;
  priority: OutreachPriority;
  owner_admin_id: string | null;
  source: 'admin-opportunity' | 'manual' | 'import';
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_channel: OutreachChannel | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  claimed_at: string | null;
  upgraded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachAdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface OutreachBusinessSummary {
  id: string;
  name: string;
  city: string | null;
  category: string | null;
}

export interface OutreachLeadWithBusiness extends OutreachLeadRecord {
  business: OutreachBusinessSummary | null;
  owner: OutreachAdminUser | null;
}

function isMissingRelationError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes('does not exist') || message.includes('relation') || message.includes('schema cache');
}

export async function getAdminBusinessOpportunities(filters: OpportunityFilters = {}): Promise<OpportunityResult> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100);
  const page = Math.max(filters.page ?? 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('admin_business_opportunity_v1')
    .select('*', { count: 'exact' });

  const search = filters.search?.trim();
  if (search) {
    const safeSearch = search.replace(/,/g, ' ');
    query = query.or(`name.ilike.%${safeSearch}%,city.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
  }

  if (filters.city && filters.city !== 'all') {
    query = query.eq('city', filters.city);
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  if (filters.claimed === 'claimed') {
    query = query.eq('is_claimed', true);
  } else if (filters.claimed === 'unclaimed') {
    query = query.eq('is_claimed', false);
  }

  if (filters.action && filters.action !== 'all') {
    query = query.eq('recommended_action', filters.action);
  }

  const { data, error, count } = await query
    .order('acquisition_score', { ascending: false })
    .order('upgrade_score', { ascending: false })
    .range(from, to);

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        data: [],
        count: 0,
        warning: 'Opportunity schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }

    throw new Error(`Failed to load admin opportunities: ${error.message}`);
  }

  return {
    data: (data ?? []) as AdminOpportunity[],
    count: count ?? 0,
  };
}

export async function createOutreachLead(input: OutreachLeadInput): Promise<{ success: boolean; warning?: string; data?: OutreachLeadRecord }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const payload = {
    business_id: input.businessId,
    stage: input.stage ?? 'new',
    priority: input.priority ?? 'medium',
    source: input.source ?? 'admin-opportunity',
    contact_name: input.contactName ?? null,
    contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null,
    contact_channel: input.contactChannel ?? null,
    notes: input.notes ?? null,
    owner_admin_id: input.ownerAdminId ?? null,
    next_follow_up_at: input.nextFollowUpAt ?? null,
  };

  const { data, error } = await supabase
    .from('business_outreach_pipeline')
    .upsert(payload, { onConflict: 'business_id' })
    .select('*')
    .single();

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }
    throw new Error(`Failed to create outreach lead: ${error.message}`);
  }

  return { success: true, data: data as OutreachLeadRecord };
}

export async function updateOutreachStage(id: string, stage: OutreachStage): Promise<{ success: boolean; warning?: string }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const patch: Record<string, string | null> = { stage };
  if (stage === 'contacted') patch.last_contacted_at = new Date().toISOString();
  if (stage === 'claimed') patch.claimed_at = new Date().toISOString();
  if (stage === 'upgraded') patch.upgraded_at = new Date().toISOString();

  const { error } = await supabase
    .from('business_outreach_pipeline')
    .update(patch)
    .eq('id', id);

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }
    throw new Error(`Failed to update outreach stage: ${error.message}`);
  }

  return { success: true };
}

export async function assignOutreachOwner(id: string, ownerAdminId: string | null): Promise<{ success: boolean; warning?: string }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('business_outreach_pipeline')
    .update({ owner_admin_id: ownerAdminId })
    .eq('id', id);

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }
    throw new Error(`Failed to assign outreach owner: ${error.message}`);
  }

  return { success: true };
}

export async function setOutreachFollowUp(id: string, nextFollowUpAt: string | null): Promise<{ success: boolean; warning?: string }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('business_outreach_pipeline')
    .update({ next_follow_up_at: nextFollowUpAt })
    .eq('id', id);

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }
    throw new Error(`Failed to set outreach follow-up: ${error.message}`);
  }

  return { success: true };
}

export async function updateOutreachNotes(id: string, notes: string): Promise<{ success: boolean; warning?: string }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('business_outreach_pipeline')
    .update({ notes })
    .eq('id', id);

  if (error) {
    if (isMissingRelationError(error)) {
      return {
        success: false,
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }
    throw new Error(`Failed to update outreach notes: ${error.message}`);
  }

  return { success: true };
}

export async function getOutreachPipelineBoardData(): Promise<{ leads: OutreachLeadWithBusiness[]; admins: OutreachAdminUser[]; warning?: string }> {
  await verifyAdminSession();
  const supabase = await createAdminClient();

  const [leadsResult, adminsResult] = await Promise.all([
    supabase
      .from('business_outreach_pipeline')
      .select('*')
      .order('next_follow_up_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'admin')
      .order('full_name', { ascending: true }),
  ]);

  if (leadsResult.error) {
    if (isMissingRelationError(leadsResult.error)) {
      return {
        leads: [],
        admins: (adminsResult.data ?? []) as OutreachAdminUser[],
        warning: 'Outreach schema not deployed yet. Run migration: 20260304101000_admin_opportunity_insights.sql',
      };
    }

    throw new Error(`Failed to load outreach leads: ${leadsResult.error.message}`);
  }

  if (adminsResult.error) {
    throw new Error(`Failed to load admin users: ${adminsResult.error.message}`);
  }

  const leads = (leadsResult.data ?? []) as OutreachLeadRecord[];
  const businessIds = Array.from(new Set(leads.map((lead) => lead.business_id)));
  const ownerIds = Array.from(new Set(leads.map((lead) => lead.owner_admin_id).filter(Boolean))) as string[];

  const [businessesLookupResult, ownersLookupResult] = await Promise.all([
    businessIds.length
      ? supabase
          .from('businesses')
          .select('id, name, city, category')
          .in('id', businessIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (businessesLookupResult.error) {
    throw new Error(`Failed to load businesses for outreach board: ${businessesLookupResult.error.message}`);
  }

  if (ownersLookupResult.error) {
    throw new Error(`Failed to load owners for outreach board: ${ownersLookupResult.error.message}`);
  }

  const businessMap = new Map<string, OutreachBusinessSummary>(
    ((businessesLookupResult.data ?? []) as OutreachBusinessSummary[]).map((biz) => [biz.id, biz]),
  );
  const ownerMap = new Map<string, OutreachAdminUser>(
    ((ownersLookupResult.data ?? []) as OutreachAdminUser[]).map((owner) => [owner.id, owner]),
  );

  const hydratedLeads: OutreachLeadWithBusiness[] = leads.map((lead) => ({
    ...lead,
    business: businessMap.get(lead.business_id) ?? null,
    owner: lead.owner_admin_id ? ownerMap.get(lead.owner_admin_id) ?? null : null,
  }));

  return {
    leads: hydratedLeads,
    admins: (adminsResult.data ?? []) as OutreachAdminUser[],
  };
}
