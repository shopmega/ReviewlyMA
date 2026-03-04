import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  assignOutreachOwner,
  getOutreachPipelineBoardData,
  setOutreachFollowUp,
  updateOutreachNotes,
  updateOutreachStage,
  type OutreachStage,
} from '@/app/actions/admin-opportunities';

const STAGES: Array<{ key: OutreachStage; label: string }> = [
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'interested', label: 'Interested' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'upgraded', label: 'Upgraded' },
  { key: 'lost', label: 'Lost' },
];

function toDateInputValue(value: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const value = searchParams[key];
  if (!value) return '';
  return Array.isArray(value) ? value[0] || '' : value;
}

export default async function AdminOutreachPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  async function updateStageAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const stage = String(formData.get('stage') || '') as OutreachStage;
    if (!id || !stage) return;
    await updateOutreachStage(id, stage);
    revalidatePath('/admin/outreach');
  }

  async function assignOwnerAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const ownerAdminIdRaw = String(formData.get('owner_admin_id') || '');
    if (!id) return;
    await assignOutreachOwner(id, ownerAdminIdRaw || null);
    revalidatePath('/admin/outreach');
  }

  async function followUpAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const nextFollowUpAtRaw = String(formData.get('next_follow_up_at') || '');
    if (!id) return;
    await setOutreachFollowUp(id, nextFollowUpAtRaw || null);
    revalidatePath('/admin/outreach');
  }

  async function notesAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const notes = String(formData.get('notes') || '');
    if (!id) return;
    await updateOutreachNotes(id, notes.trim());
    revalidatePath('/admin/outreach');
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const stageFilter = getSearchParam(resolvedSearchParams, 'stage');
  const ownerFilter = getSearchParam(resolvedSearchParams, 'owner');
  const cityFilter = getSearchParam(resolvedSearchParams, 'city');
  const categoryFilter = getSearchParam(resolvedSearchParams, 'category');
  const overdueOnly = getSearchParam(resolvedSearchParams, 'overdue') === '1';

  const { leads, admins, warning } = await getOutreachPipelineBoardData();

  const cityOptions = Array.from(new Set(leads.map((lead) => lead.business?.city).filter(Boolean))) as string[];
  const categoryOptions = Array.from(new Set(leads.map((lead) => lead.business?.category).filter(Boolean))) as string[];
  cityOptions.sort((a, b) => a.localeCompare(b));
  categoryOptions.sort((a, b) => a.localeCompare(b));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredLeads = leads.filter((lead) => {
    if (stageFilter && stageFilter !== 'all' && lead.stage !== stageFilter) return false;
    if (ownerFilter === 'unassigned' && lead.owner_admin_id) return false;
    if (ownerFilter && ownerFilter !== 'all' && ownerFilter !== 'unassigned' && lead.owner_admin_id !== ownerFilter) return false;
    if (cityFilter && cityFilter !== 'all' && lead.business?.city !== cityFilter) return false;
    if (categoryFilter && categoryFilter !== 'all' && lead.business?.category !== categoryFilter) return false;

    if (overdueOnly) {
      if (!lead.next_follow_up_at) return false;
      if (lead.stage === 'upgraded' || lead.stage === 'lost') return false;
      const followUpDate = new Date(lead.next_follow_up_at);
      followUpDate.setHours(0, 0, 0, 0);
      if (followUpDate >= today) return false;
    }

    return true;
  });

  const leadsByStage = new Map<OutreachStage, typeof filteredLeads>();
  for (const stage of STAGES) {
    leadsByStage.set(stage.key, filteredLeads.filter((lead) => lead.stage === stage.key));
  }

  const overdueCount = leads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    if (lead.stage === 'upgraded' || lead.stage === 'lost') return false;
    const followUpDate = new Date(lead.next_follow_up_at);
    followUpDate.setHours(0, 0, 0, 0);
    return followUpDate < today;
  }).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Outreach Pipeline</h1>
        <p className="text-muted-foreground mt-2">
          Gestion operationnelle des leads entreprises: assignation, suivi et conversion.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Filter by stage, owner, overdue, city, and category.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <select name="stage" defaultValue={stageFilter || 'all'} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="all">All stages</option>
              {STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>

            <select name="owner" defaultValue={ownerFilter || 'all'} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="all">All owners</option>
              <option value="unassigned">Unassigned</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email || admin.id}
                </option>
              ))}
            </select>

            <select name="city" defaultValue={cityFilter || 'all'} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="all">All cities</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              name="category"
              defaultValue={categoryFilter || 'all'}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select name="overdue" defaultValue={overdueOnly ? '1' : '0'} className="h-10 rounded-md border bg-background px-2 text-sm">
              <option value="0">All follow-ups</option>
              <option value="1">Overdue only</option>
            </select>

            <div className="xl:col-span-5 flex items-center gap-2">
              <Button type="submit" size="sm">
                Apply Filters
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/admin/outreach">Reset</Link>
              </Button>
              <Badge variant="secondary">Filtered leads: {filteredLeads.length}</Badge>
              <Badge variant={overdueCount > 0 ? 'destructive' : 'secondary'}>Overdue: {overdueCount}</Badge>
            </div>
          </form>
        </CardContent>
      </Card>

      {warning ? (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-6">
            <p className="font-semibold text-amber-900">Schema non deploye</p>
            <p className="text-sm text-amber-800 mt-1">{warning}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {STAGES.map((stage) => {
          const stageLeads = leadsByStage.get(stage.key) || [];
          return (
            <Card key={stage.key} className="min-h-[320px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{stage.label}</CardTitle>
                  <Badge variant="secondary">{stageLeads.length}</Badge>
                </div>
                <CardDescription>{stage.key}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageLeads.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No leads in this stage.</div>
                ) : (
                  stageLeads.map((lead) => (
                    <Card key={lead.id} className="border border-border/60">
                      <CardContent className="pt-4 space-y-3">
                        <div>
                          <div className="font-semibold">{lead.business?.name || lead.business_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {[lead.business?.city, lead.business?.category].filter(Boolean).join(' - ') || 'No metadata'}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Owner: {lead.owner?.full_name || lead.owner?.email || 'Unassigned'}
                        </div>

                        <form action={updateStageAction} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <select
                            name="stage"
                            defaultValue={lead.stage}
                            className="h-9 rounded-md border bg-background px-2 text-sm w-full"
                          >
                            {STAGES.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </form>

                        <form action={assignOwnerAction} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <select
                            name="owner_admin_id"
                            defaultValue={lead.owner_admin_id || ''}
                            className="h-9 rounded-md border bg-background px-2 text-sm w-full"
                          >
                            <option value="">Unassigned</option>
                            {admins.map((admin) => (
                              <option key={admin.id} value={admin.id}>
                                {admin.full_name || admin.email || admin.id}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="sm" variant="outline">
                            Assign
                          </Button>
                        </form>

                        <form action={followUpAction} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <input
                            type="date"
                            name="next_follow_up_at"
                            defaultValue={toDateInputValue(lead.next_follow_up_at)}
                            className="h-9 rounded-md border bg-background px-2 text-sm w-full"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Follow-up
                          </Button>
                        </form>

                        <form action={notesAction} className="space-y-2">
                          <input type="hidden" name="id" value={lead.id} />
                          <textarea
                            name="notes"
                            defaultValue={lead.notes || ''}
                            placeholder="Latest call summary, objections, next action..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[78px]"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Save Notes
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
