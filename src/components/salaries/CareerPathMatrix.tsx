import { getCareerPathMetrics } from '@/lib/data/salaries';
import { getServerTranslator } from '@/lib/i18n/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Award, Zap, Briefcase } from 'lucide-react';

export async function CareerPathMatrix({ jobTitle }: { jobTitle: string }) {
  const { t, tf, locale } = await getServerTranslator();
  const metrics = await getCareerPathMetrics(jobTitle);
  const numberLocale = locale === 'fr' ? 'fr-MA' : 'en-US';

  if (!metrics || metrics.length < 2) return null;

  const maxSalary = Math.max(...metrics.map(m => m.median_salary));

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'junior': return <Zap className="h-4 w-4 text-emerald-500" />;
      case 'confirme': return <Briefcase className="h-4 w-4 text-sky-500" />;
      case 'senior': return <Award className="h-4 w-4 text-amber-500" />;
      case 'expert':
      case 'manager':
      case 'lead': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default: return <Briefcase className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatLevel = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'junior': return t('salary.levels.junior', 'Junior');
      case 'confirme': return t('salary.levels.confirme', 'Confirmé');
      case 'senior': return t('salary.levels.senior', 'Senior');
      case 'expert': return t('salary.levels.expert', 'Expert');
      case 'manager': return t('salary.levels.manager', 'Manager');
      case 'lead': return t('salary.levels.lead', 'Lead');
      default: return level;
    }
  };

  return (
    <Card className="rounded-3xl border border-border/60 bg-gradient-to-br from-card to-secondary/10 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {t('salary.careerMatrix.title', 'Progression de carrière')}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {tf('salary.careerMatrix.description', 'Evolution du salaire médian par niveau d\'expérience pour {job}.', { job: jobTitle })}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-6">
          {metrics.map((item, idx) => {
            const ratio = maxSalary > 0 ? (item.median_salary / maxSalary) * 100 : 0;
            return (
              <div key={`${item.job_title}-${item.seniority_level}`} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getLevelIcon(item.seniority_level)}
                    <span className="font-bold text-sm uppercase tracking-wide">
                      {formatLevel(item.seniority_level)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black">{item.median_salary.toLocaleString(numberLocale)} MAD</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                      {item.avg_years_experience} {t('salary.common.yearsAvg', 'ans moy.')}
                    </p>
                  </div>
                </div>
                <div className="h-5 w-full rounded-full bg-secondary/50 p-1">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-1000 ease-out flex items-center justify-end px-2"
                    style={{ width: `${Math.max(15, ratio)}%` }}
                  >
                    {ratio > 30 && (
                      <span className="text-[9px] font-bold text-primary-foreground opacity-80">
                         {item.submission_count} {t('salary.common.samples', 'points')}
                      </span>
                    )}
                  </div>
                </div>
                {idx < metrics.length - 1 && (
                  <div className="absolute left-[11px] top-6 w-0.5 h-6 bg-border/40" />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground leading-relaxed">
             {t('salary.careerMatrix.note', 'Cette matrice est basée sur l\'ensemble des données nationales publiées pour ce poste. Les écarts peuvent varier selon la ville et le secteur.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
