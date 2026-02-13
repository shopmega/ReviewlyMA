import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

type SourceRow = {
  name?: string;
  slug?: string;
  city?: string;
  industry?: string;
  address?: string;
  website?: string;
};

type ImportRow = {
  name: string;
  category: string;
  subcategory: string;
  city: string;
  location: string;
  description: string;
  phone: string;
  website: string;
  is_premium: string;
  tier: string;
  tags: string;
};

const industryToCategory: Record<string, string> = {
  Banking: 'Banque & Finance',
  Insurance: 'Banque & Finance',
  'Accounting & Audit': 'Banque & Finance',

  'BPO / Call Center': "Centres d'Appel & BPO",

  Retail: 'Distribution & Commerce',
  'E-commerce': 'Distribution & Commerce',
  'Import/Export': 'Distribution & Commerce',
  'Food & Beverage': 'Distribution & Commerce',

  Manufacturing: 'Industrie & Chimie',
  Textiles: 'Industrie & Chimie',
  Pharmaceuticals: 'Industrie & Chimie',
  Mining: 'Industrie & Chimie',
  'Printing & Packaging': 'Industrie & Chimie',
  Automotive: 'Industrie & Chimie',
  Agriculture: 'Industrie & Chimie',

  'IT & Software': 'Technologie & IT',
  Telecom: 'Technologie & IT',

  'Logistics & Transport': 'Transport & Logistique',

  Consulting: 'Services Professionnels',
  'Legal Services': 'Services Professionnels',
  'Marketing & Advertising': 'Services Professionnels',
  'Security Services': 'Services Professionnels',
  'Cleaning Services': 'Services Professionnels',
  'Maintenance Services': 'Services Professionnels',
  Engineering: 'Services Professionnels',

  Healthcare: 'Santé & Bien-être',

  Hospitality: 'Hôtels & Hébergement',

  'Real Estate': 'Immobilier & Construction',
  Construction: 'Immobilier & Construction',

  Energy: 'Énergie & Environnement',

  Education: 'Éducation & Formation',
};

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function repairMojibake(value: string): string {
  if (!value) return value;
  if (/[ÃÂâ€™â€œâ€]/.test(value)) {
    try {
      return Buffer.from(value, 'latin1').toString('utf8');
    } catch {
      return value;
    }
  }
  return value;
}

function mapIndustryToCategory(industry: string): string {
  return industryToCategory[industry] || 'Services Professionnels';
}

function toImportRow(row: SourceRow): ImportRow | null {
  const name = normalizeSpace(repairMojibake(row.name || ''));
  const city = normalizeSpace(repairMojibake(row.city || ''));
  const industry = normalizeSpace(repairMojibake(row.industry || ''));
  const location = normalizeSpace(repairMojibake(row.address || city));
  const website = normalizeSpace(repairMojibake(row.website || ''));

  if (!name || !city || !industry) return null;

  const category = mapIndustryToCategory(industry);
  const tags = [industry, city].filter(Boolean).join(',');

  return {
    name,
    category,
    subcategory: industry,
    city,
    location,
    description: `Entreprise du secteur ${industry} basée à ${city}.`,
    phone: '',
    website,
    is_premium: 'false',
    tier: 'none',
    tags,
  };
}

function main() {
  const inputArg = process.argv[2];
  const outputArg = process.argv[3];

  const inputPath = inputArg || 'C:/Users/Zouhair/Downloads/synthetic_morocco_companies_5000.csv';
  const outputPath = outputArg || path.join(process.cwd(), 'data/import/companies_import_ready_5000.csv');
  const reportPath = path.join(path.dirname(outputPath), 'companies_import_mapping_report.json');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const csvText = fs.readFileSync(inputPath, 'utf8');
  const parsed = Papa.parse<SourceRow>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse errors found: ${parsed.errors[0].message}`);
  }

  const rows = parsed.data;
  const mappedRows: ImportRow[] = [];
  const droppedRows: SourceRow[] = [];
  const unmappedIndustries = new Set<string>();
  const categoryCounts: Record<string, number> = {};

  for (const row of rows) {
    const industry = normalizeSpace(row.industry || '');
    if (industry && !industryToCategory[industry]) unmappedIndustries.add(industry);

    const mapped = toImportRow(row);
    if (!mapped) {
      droppedRows.push(row);
      continue;
    }
    categoryCounts[mapped.category] = (categoryCounts[mapped.category] || 0) + 1;
    mappedRows.push(mapped);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Papa.unparse(mappedRows), 'utf8');

  const report = {
    inputPath,
    outputPath,
    totalInputRows: rows.length,
    totalOutputRows: mappedRows.length,
    droppedRows: droppedRows.length,
    unmappedIndustriesFallbackToServices: Array.from(unmappedIndustries).sort(),
    categoryCounts,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));
}

main();
