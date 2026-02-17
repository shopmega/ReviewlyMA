-- Seeded salary validation options (roles, departments, intervals)
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS salary_roles TEXT[] DEFAULT ARRAY[
  'Ingenieur logiciel',
  'Ingenieur logiciel senior',
  'Lead technique',
  'Manager ingenierie',
  'Chef de produit',
  'Analyste data',
  'Data scientist',
  'Designer UX',
  'Designer UI',
  'Ingenieur QA',
  'Ingenieur DevOps',
  'Specialiste RH',
  'Specialiste marketing',
  'Representant commercial',
  'Support client'
],
ADD COLUMN IF NOT EXISTS salary_departments TEXT[] DEFAULT ARRAY[
  'Ingenierie',
  'Produit',
  'Design',
  'Data',
  'Operations',
  'Ressources humaines',
  'Marketing',
  'Commercial',
  'Finance',
  'Juridique',
  'Support client'
],
ADD COLUMN IF NOT EXISTS salary_intervals JSONB DEFAULT '[
  {"id":"lt_3000","label":"Moins de 3 000 MAD","min":500,"max":2999},
  {"id":"3000_4999","label":"3 000 - 4 999 MAD","min":3000,"max":4999},
  {"id":"5000_7999","label":"5 000 - 7 999 MAD","min":5000,"max":7999},
  {"id":"8000_11999","label":"8 000 - 11 999 MAD","min":8000,"max":11999},
  {"id":"12000_19999","label":"12 000 - 19 999 MAD","min":12000,"max":19999},
  {"id":"20000_29999","label":"20 000 - 29 999 MAD","min":20000,"max":29999},
  {"id":"30000_plus","label":"30 000+ MAD","min":30000,"max":10000000}
]'::jsonb;

UPDATE public.site_settings
SET
  salary_roles = COALESCE(
    salary_roles,
    ARRAY[
      'Ingenieur logiciel',
      'Ingenieur logiciel senior',
      'Lead technique',
      'Manager ingenierie',
      'Chef de produit',
      'Analyste data',
      'Data scientist',
      'Designer UX',
      'Designer UI',
      'Ingenieur QA',
      'Ingenieur DevOps',
      'Specialiste RH',
      'Specialiste marketing',
      'Representant commercial',
      'Support client'
    ]
  ),
  salary_departments = COALESCE(
    salary_departments,
    ARRAY[
      'Ingenierie',
      'Produit',
      'Design',
      'Data',
      'Operations',
      'Ressources humaines',
      'Marketing',
      'Commercial',
      'Finance',
      'Juridique',
      'Support client'
    ]
  ),
  salary_intervals = COALESCE(
    salary_intervals,
    '[
      {"id":"lt_3000","label":"Moins de 3 000 MAD","min":500,"max":2999},
      {"id":"3000_4999","label":"3 000 - 4 999 MAD","min":3000,"max":4999},
      {"id":"5000_7999","label":"5 000 - 7 999 MAD","min":5000,"max":7999},
      {"id":"8000_11999","label":"8 000 - 11 999 MAD","min":8000,"max":11999},
      {"id":"12000_19999","label":"12 000 - 19 999 MAD","min":12000,"max":19999},
      {"id":"20000_29999","label":"20 000 - 29 999 MAD","min":20000,"max":29999},
      {"id":"30000_plus","label":"30 000+ MAD","min":30000,"max":10000000}
    ]'::jsonb
  )
WHERE id = 'main';
