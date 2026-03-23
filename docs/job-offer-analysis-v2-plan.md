# Job Offer Analysis V2 Plan

## Goal
Expand the job-offer analysis module from a salary-and-structure checker into a broader decision layer that combines:
- offer quality
- employer context
- market comparables
- business analytics
- action-oriented CTAs

## Current State
### Already implemented
- Offer extraction and normalization
- Salary-based benchmark scoring
- Company mapping to `businesses`
- Public business hiring signals
- Business dashboard hiring analytics
- Candidate history and compare mode
- Admin mapping queue and backfill workflow

### Main gaps
- Reviews are not used in offer interpretation
- Rich business profile data is not used in offer interpretation
- Similar offers are not surfaced to users
- CTA generation is basic
- Employer analytics are descriptive, not prescriptive
- The journey is still screen-by-screen rather than a clearly designed multi-step flow
- Loading and AI-processing states are functional but not productized
- The module does not clearly frame itself as AI-powered decision support

## Phase 1: Employer Context Layer
### Objective
Add employer context next to the offer verdict without contaminating compensation scoring.

### Data to use
- `businesses`
- `reviews`
- `salary_company_metrics`
- verification fields from `businesses`

### Deliverables
- Add an `Employer Context` block to the analysis result
- Show:
  - average rating
  - review count
  - claimed / verified state
  - company size if available
  - salary reputation if mapped
- Add soft interpretation labels:
  - `Strong employer signal`
  - `Mixed employer signal`
  - `Limited employer signal`

### Rules
- Do not blend review score into salary score
- Keep employer context separate from compensation verdict
- Only show employer context when company mapping confidence is high

### Files likely involved
- `src/components/job-offers/JobOfferAnalysisResult.tsx`
- `src/lib/data/businesses.ts`
- `src/lib/data/job-offers.ts`
- `src/lib/types.ts`

## Phase 2: Similar Offers
### Objective
Show comparable approved analyzed offers from other companies.

### Matching logic
Use:
- normalized role
- city
- seniority
- work model
- contract type

### Deliverables
- Add `Similar Offers` section on analysis result
- Show 3 to 5 offers with:
  - company
  - title
  - city
  - salary visibility
  - market label
  - overall score

### Rules
- Exclude the current offer
- Only use approved offers
- Respect visibility and privacy rules
- Require minimum comparison quality before showing

### Data additions
- Query helper:
  - `getSimilarJobOfferAnalyses(...)`

### Files likely involved
- `src/lib/data/job-offers.ts`
- `src/app/job-offers/[analysisId]/page.tsx`
- `src/components/job-offers/JobOfferAnalysisResult.tsx`

## Phase 3: Review-Aware Interpretation
### Objective
Use reviews as contextual risk signals, not as direct offer-score inputs.

### Deliverables
- Add interpretation flags such as:
  - `Offer looks fine, but employer reputation is weak`
  - `Compensation is unclear and employee sentiment is mixed`
  - `Employer reviews reinforce a positive read`

### Inputs
- review count
- average rating
- optional review theme summaries later

### Rules
- Only activate when review sample size is meaningful
- Avoid hard claims from thin review counts
- Keep this as a context layer, not a benchmark layer

## Phase 4: CTA System
### Objective
Turn the analysis into a decision workflow instead of a static report.

### CTA types
- `View company reviews`
- `Compare with similar offers`
- `Check salary benchmarks`
- `Ask for salary before continuing`
- `See other companies hiring this role`

### CTA logic
Map CTAs to verdict conditions:
- missing salary -> negotiation / recruiter-question CTA
- high-confidence mapped company -> reviews and salary pages CTA
- strong benchmark coverage -> compare offers CTA
- weak employer context -> review employer before applying CTA

### Deliverables
- CTA decision helper
- dynamic CTA block in analysis result
- tracked CTA analytics events

### Files likely involved
- `src/components/job-offers/JobOfferAnalysisResult.tsx`
- `src/lib/job-offers/`
- `src/lib/analytics.ts`

## Phase 5: Employer Analytics Recommendations
### Objective
Turn business analytics into actionable recommendations.

### Deliverables
- Add recommendation engine for business dashboards:
  - `Salary disclosure is below peer norm`
  - `Benefits are often missing from your offers`
  - `Hybrid offers appear clearer than onsite-only offers`
- Add a `Recommended actions` block in dashboard analytics

### Inputs
- `job_offer_business_insights`
- `job_offer_business_monthly_trends`
- role/city and peer employer comparisons

### Rules
- Recommendations must be explainable
- No black-box advice
- Tie each recommendation to one visible metric

## Phase 6: Sector-Aware Benchmarking
### Objective
Improve peer relevance for company and employer insights.

### Deliverables
- Add category/subcategory-aware peer grouping
- Segment similar offers and employer comparisons by sector
- Improve public hiring signals with sector-relative phrasing

### Inputs
- `businesses.category`
- `businesses.subcategory`

### Impact
This reduces misleading comparisons across unrelated employers.

## Phase 7: Admin and Ops Hardening
### Objective
Strengthen maintainability and data quality.

### Deliverables
- Admin filters for mapping queue by:
  - confidence
  - company name
  - city
  - source
- Benchmark-gap reporting
- Extraction failure analytics
- Moderation funnel reporting
- Manual alias support later if needed

### Optional schema additions
- `business_aliases`
- `job_offer_match_reviews`
- extra moderation event taxonomy

## Delivery Order
1. Employer Context Layer
2. Similar Offers
3. CTA System
4. Review-Aware Interpretation
5. Employer Analytics Recommendations
6. Sector-Aware Benchmarking
7. Admin and Ops Hardening

## Success Metrics
- % of analyses that open a second surface
  - reviews
  - salaries
  - similar offers
- repeat analysis rate
- compare-mode usage
- recruiter-question usage
- business dashboard engagement with hiring recommendations
- mapping queue reduction over time
- salary disclosure rate improvement over time

## Guardrails
- Never treat missing salary as disclosed salary
- Never expose private raw offer data on public business pages
- Never auto-link ambiguous employer matches publicly
- Never mix review reputation directly into salary benchmark scoring
- Always label thin-sample signals as limited

## Next Build Target
If we implement this in order, the highest-value next milestone is:

**V2.1**
- Employer Context block
- Similar Offers block
- Dynamic CTA block

That gives the module the biggest product lift with the least architecture risk.

## Full Journey Product Framing
This module should not be framed as a simple form followed by a report.

It should be framed as an AI-powered decision workflow that helps a user:
- ingest an offer
- understand what was extracted
- assess the offer itself
- understand the employer
- compare alternatives
- decide what to do next

The product language should explicitly say this is AI-powered, while still being careful about confidence and limitations.

Recommended framing:
- `AI-powered job offer analysis`
- `AI-assisted offer review`
- `Private AI analysis for job offers`

Recommended support language:
- `AI helps extract and structure the offer, then combines it with market and employer context.`
- `This is decision support, not ground truth. Verify important details with the recruiter.`
- `Confidence depends on the quality of the source and available benchmarks.`

## End-To-End Multi-Step Flow
The full experience should become a guided multi-step journey, not just a single analyze form and a long result page.

Recommended step flow:
1. Source input
2. AI extraction and validation
3. Analysis generation
4. Decision workspace result
5. Save, compare, and follow-up actions

This step structure should exist at both UX and visual levels.

## Pre-Result Step Architecture
### Step 1: Source input
Purpose:
- let the user provide a URL or pasted offer text

Inputs:
- source URL
- pasted text
- optional source label later

UX requirements:
- clearly explain accepted inputs
- show a short promise:
  - `AI will extract the offer, score visible signals, and generate follow-up actions`
- show privacy reassurance:
  - `Private analysis`
  - `Saved to your account`

Suggested microcopy:
- `Paste a job offer or drop a link`
- `AI will extract the offer details and build a decision workspace`

### Step 2: AI extraction and validation
Purpose:
- show that the system is actively reading and structuring the offer

This step should not feel like a generic spinner.

Recommended visible sub-states:
- `Reading the source`
- `Extracting company, role, salary, and conditions`
- `Checking confidence and missing fields`
- `Matching the employer`
- `Comparing against available benchmarks`

UX requirements:
- progress indicator
- explicit AI-powered label
- clear fallback when extraction is incomplete

Suggested microcopy:
- `AI is reading the offer`
- `Structuring key details`
- `Checking what is clear and what still needs verification`

### Step 3: Analysis generation
Purpose:
- communicate that the system is doing more than parsing fields

Recommended visible sub-states:
- `Building the offer verdict`
- `Checking employer context`
- `Finding similar offers`
- `Generating recommended next actions`

This stage should reinforce that the product is producing a decision workflow, not just parsed data.

### Step 4: Decision workspace result
Purpose:
- present the result in the layered structure defined below

This is where the user moves from passive loading into active decision-making.

### Step 5: Save, compare, and follow-up actions
Purpose:
- turn a one-off analysis into a retained workflow

Actions:
- save analysis
- compare with past analyses
- open company reviews
- view salary benchmarks
- analyze another offer

## Loading State Design
Loading states are part of the product, not just implementation.

### Requirements
- Must explicitly mention AI
- Must show progress in understandable language
- Must reassure the user that imperfect source quality can still produce useful output
- Must not overclaim certainty

### Recommended loading structure
#### State A: Initial processing
- headline: `AI is analyzing your offer`
- body: `We are extracting the role, company, salary, and work conditions from the source you provided.`

#### State B: Structured extraction
- headline: `Structuring the offer`
- body: `AI is identifying the visible facts and flagging what is missing or uncertain.`

#### State C: Market and employer checks
- headline: `Comparing with market and employer signals`
- body: `We are checking salary benchmarks, employer mapping, and available context.`

#### State D: Final assembly
- headline: `Building your decision workspace`
- body: `Your verdict, questions, comparisons, and next actions are being prepared.`

### Optional UX treatment
- progress rail with step names
- animated checklist
- short rotating helper notes:
  - `Some offers are incomplete. AI will still surface useful questions.`
  - `Missing salary lowers confidence but not usefulness.`
  - `Employer context appears only when company matching is reliable.`

## V2.1 Screen-Level Spec
### Product framing
V2.1 should stop behaving like a single static report and start behaving like a decision workspace.

The result page should answer questions in this order:
1. Is this offer clear and worth looking at?
2. What does this employer look like?
3. How does this compare to other offers?
4. What should I do next?

That means the page is no longer just:
- extract offer
- score salary
- show verdict

It becomes a multi-layer decision page with five stacked lenses:
- Offer verdict
- Employer context
- Similar offers
- Action CTAs
- Deeper business and market interpretation

This result page is only one step inside a broader multi-step AI-powered job analysis flow.

## V2.1 Page Hierarchy
Use this order on the result page:
1. Header / identity strip
2. Decision cockpit hero
3. Offer facts
4. Positives vs concerns
5. Missing information
6. Employer Context
7. Similar Offers
8. Dynamic CTA block
9. Recruiter questions
10. Facts vs diagnostics
11. Source / technical details

This keeps the user in a natural decision sequence instead of mixing all signals into one report.

## Multi-Step Result Navigation
The result experience should also behave as a multi-step workspace, not just a long document.

Recommended result-step tabs or progress nav:
1. Offer
2. Employer
3. Compare
4. Next actions
5. Details

Mapping:
- `Offer` = hero, facts, positives, missing information
- `Employer` = Employer Context and review-aware interpretation
- `Compare` = Similar Offers and market comparables
- `Next actions` = CTA rail and recruiter questions
- `Details` = diagnostics, extraction confidence, source details

Rules:
- Desktop can show anchored sections plus step nav
- Mobile should strongly prefer step navigation or progressive disclosure
- Users should always know where they are in the flow

## Section Spec
### Section A: Header / identity strip
Purpose:
- Anchor the user in what offer they are looking at

Content:
- company
- role title
- city
- source type
- source link if available
- save / compare / history actions

Rules:
- Keep this visually lean
- Do not overload it with interpretation

### Section B: Decision cockpit hero
Purpose:
- Give the user the core offer verdict immediately

Keep:
- verdict label
- confidence
- short summary
- best signal
- main concern
- best next step

Rules:
- This block must stay strictly about the offer itself
- Do not mix in employer reputation here
- Do not mix in review-derived interpretation here

### Section C: Offer facts block
Purpose:
- Show the extracted facts clearly before adding context

Content:
- company
- role
- city
- salary
- contract
- work model
- seniority
- benefits

Every field should carry one status:
- Confirmed
- Likely
- Limited confidence
- Not detected
- Needs verification

This becomes more important as contextual layers are added below.

### Section D: Employer Context
Purpose:
- Help the user understand the employer without polluting the offer score

Best placement:
- Right after the verdict and facts area
- Before Similar Offers

Content:
- average rating
- review count
- claimed / verified status
- company size if available
- salary reputation if mapped
- employer signal label:
  - Strong employer signal
  - Mixed employer signal
  - Limited employer signal

Recommended UI:
- compact contextual panel
- one summary line
- 3 to 5 micro-metrics
- 1 to 2 CTAs

Example CTA row:
- View company reviews
- Open company page

Rules:
- This block should feel like context, not verdict
- Use a softer visual treatment than the decision hero

### Section E: Similar Offers
Purpose:
- Give users fast comparison context

Best placement:
- Directly below Employer Context

Content:
- 3 to 5 comparable offers with:
  - company
  - title
  - city
  - salary visibility
  - market label
  - overall score

Recommended UI:
- horizontal card row on desktop
- stacked cards or carousel on mobile

Each card should include compact comparison language such as:
- clearer than average
- limited salary visibility
- stronger market signal

Rules:
- This should feel like comparison evidence, not related content
- Prefer titles like:
  - Similar offers for this role
  - Comparable offers nearby
  - How this compares to similar offers

### Section F: Dynamic CTA system
Purpose:
- Turn the result page into a workflow, not a static read

Placement:
- one primary CTA directly under the hero
- one full CTA block lower on the page

CTA examples:
- Ask for salary before continuing
- Review this employer before applying
- Compare with similar offers
- View company reviews
- Check salary benchmarks

Recommended UI:
- action cards with icon
- title
- one-line reason

Rules:
- CTAs must be generated from actual state, not shown as a generic link list
- The primary CTA should represent the single best next action

### Section G: Review-aware interpretation banner
Purpose:
- Add nuance without distorting the offer verdict

Recommended placement:
- between Employer Context and Dynamic CTA
- or folded into Employer Context as a slim interpretation banner

Example messages:
- Offer looks fine, but employer reputation is weak
- Compensation is unclear and employee sentiment is mixed
- Employer reviews reinforce a positive read

Rules:
- Show only when review sample size is meaningful
- Otherwise show nothing or a limited-signal note
- Never force this block when evidence is weak

## Confidence-State Rules
### Company mapping confidence: high
Show:
- Employer Context
- Reviews CTA
- Salary reputation if available
- Full employer links

### Company mapping confidence: medium
Show:
- limited employer context
- softer labels
- fewer strong claims

Avoid:
- forceful employer interpretation

### Company mapping confidence: low
Hide:
- strong public employer interpretation
- links that imply certainty

Show instead:
- Employer context unavailable due to uncertain mapping

This is a trust-critical rule.

## Mobile-First Layout
The page will grow long quickly, so the mobile layout must stay progressive.

Recommended mobile rhythm:
1. step header
2. hero
3. compact fact cards
4. one primary CTA
5. employer context card or accordion
6. similar offers carousel
7. recruiter questions cards
8. expandable diagnostics

Rules:
- Do not dump every section fully open on mobile
- Use progressive disclosure
- Keep diagnostics and source details collapsed by default
- Strongly consider per-step navigation on mobile instead of one continuous page

## Component Plan
Suggested component split:
- `DecisionCockpitHero`
- `OfferFactsGrid`
- `OfferInsightsSplit`
- `MissingInfoPanel`
- `EmployerContextCard`
- `EmployerSignalBadge`
- `SimilarOffersList`
- `SimilarOfferCard`
- `DynamicCtaRail`
- `RecruiterQuestionsPanel`
- `ReviewAwareSignalBanner`
- `DiagnosticsAccordion`

This supports phased rollout without forcing a full page rewrite.

## V2.1 Wireframe Logic
### Above the fold
- Header
- Decision cockpit hero
- top-level fact chips
- primary CTA

### Mid-page
- Employer Context
- Similar Offers

### Lower page
- detailed positives and concerns
- recruiter questions
- diagnostics

This gives the module the biggest lift without making the page feel rebuilt from scratch.

## UX Copy Direction
Keep each layer in a distinct voice.

### Offer verdict voice
- Practical
- Analytical
- Examples:
  - Useful signal
  - Incomplete verdict
  - Needs clarification

### Employer context voice
- Measured
- Contextual
- Examples:
  - Mixed employer signal
  - Limited employer signal
  - Public employer context is thin

### Similar offers voice
- Comparative
- Examples:
  - Clearer than this offer
  - Similar seniority, stronger salary visibility
  - Nearby market alternative

### CTA voice
- Action-oriented
- Examples:
  - Review employer before applying
  - Compare similar offers
  - Ask for salary before continuing

## Rollout Sequence From A Design Perspective
Release 1:
- Employer Context card

Release 2:
- Similar Offers cards

Release 3:
- Replace static CTA links with Dynamic CTA rail

Release 4:
- Add review-aware interpretation banner

Release 5:
- Expand dashboard recommendation UX

Release 6:
- Convert the end-to-end analysis journey into a visible multi-step AI-powered flow with structured loading states

## Strongest Recommendation
Do not treat V2.1 as adding more sections.

Treat it as shifting the page from:
- single-offer output

to:
- multi-layer decision environment

That mindset should guide both layout and interaction design.

It should also guide the whole module from:
- submit and wait

to:
- guided multi-step AI-powered analysis journey
