import { BriefcaseBusiness } from 'lucide-react';
import type { JobOfferDecisionWorkspace } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  workspace: JobOfferDecisionWorkspace;
};

export function RecruiterQuestionsPanel({ workspace }: Props) {
  return (
    <div className="grid gap-4 xl:grid-cols-2" id="actions-step">
      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-tight">Questions to ask the recruiter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.recruiterQuestions.map((question) => (
            <div key={question} className="rounded-[1.2rem] border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-950">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="border-sky-200 bg-white text-sky-900">Action</Badge>
              </div>
              {question}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[1.8rem] border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black tracking-tight">Likely interview topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspace.interviewTopics.map((topic) => (
            <div key={topic} className="flex items-start gap-3 rounded-[1.2rem] border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700">
              <BriefcaseBusiness className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
              <span>{topic}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
