'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Crown, Info, Loader2, Mail, MapPin, Phone, Sparkles, Store, Upload, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ClaimFormData = {
  businessName: string;
  category: string;
  subcategory: string;
  city: string;
  quartier: string;
  address: string;
  phone: string;
  website: string;
  description: string;
  fullName: string;
  position: string;
  claimerType: string;
  claimerTitle: string;
  email: string;
  personalPhone: string;
};

type ProofMethod = {
  value: string;
  label: string;
  description: string;
};

type ProofData = {
  documentFile: File | null;
  videoFile: File | null;
};

export function ClaimBusinessDetailsStep({
  formData,
  categoryOptions,
  subcategoryOptions,
  cityOptions,
  quartierOptions,
  missingStep1Fields,
  missingStep1Message,
  canProceedToStep2,
  onInputChange,
  onSelectChange,
  onNext,
  labels,
}: {
  formData: ClaimFormData;
  categoryOptions: ReadonlyArray<{ id: string; name: string }>;
  subcategoryOptions: readonly string[];
  cityOptions: readonly string[];
  quartierOptions: readonly string[];
  missingStep1Fields: readonly string[];
  missingStep1Message: string;
  canProceedToStep2: boolean;
  onInputChange: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onNext: () => void;
  labels: {
    title: string;
    description: string;
    detailsTitle: string;
    detailsDescription: string;
    businessName: string;
    businessNamePlaceholder: string;
    category: string;
    categoryPlaceholder: string;
    subcategory: string;
    subcategoryPlaceholder: string;
    city: string;
    cityPlaceholder: string;
    quartier: string;
    quartierPlaceholder: string;
    address: string;
    addressPlaceholder: string;
    phoneOptional: string;
    phonePlaceholder: string;
    websiteOptional: string;
    websitePlaceholder: string;
    presentation: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    cancel: string;
    requiredHint: string;
    next: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{labels.detailsTitle}</h3>
              <p className="text-xs text-muted-foreground">{labels.detailsDescription}</p>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-semibold">{labels.businessName} *</Label>
              <Input
                id="businessName"
                name="businessName"
                placeholder={labels.businessNamePlaceholder}
                value={formData.businessName}
                onChange={onInputChange}
                onInput={onInputChange}
                required
                className="bg-white/50 focus:bg-white transition-all border-gray-300"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold">{labels.category} *</Label>
                <Select name="category" value={formData.category} onValueChange={(value) => onSelectChange('category', value)}>
                  <SelectTrigger className="bg-white/50">
                    <SelectValue placeholder={labels.categoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory" className="text-sm font-semibold">{labels.subcategory} *</Label>
                <Select
                  name="subcategory"
                  value={formData.subcategory}
                  onValueChange={(value) => onSelectChange('subcategory', value)}
                  disabled={!formData.category}
                >
                  <SelectTrigger className="bg-white/50">
                    <SelectValue placeholder={labels.subcategoryPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategoryOptions.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-semibold">{labels.city} *</Label>
                <Select name="city" value={formData.city} onValueChange={(value) => onSelectChange('city', value)}>
                  <SelectTrigger className="bg-white/50">
                    <SelectValue placeholder={labels.cityPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quartier" className="text-sm font-semibold">{labels.quartier} *</Label>
                <Select
                  name="quartier"
                  value={formData.quartier}
                  onValueChange={(value) => onSelectChange('quartier', value)}
                  disabled={!formData.city}
                >
                  <SelectTrigger className="bg-white/50">
                    <SelectValue placeholder={labels.quartierPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {quartierOptions.map((quartier) => (
                      <SelectItem key={quartier} value={quartier}>
                        {quartier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-semibold">{labels.address} *</Label>
              <Input
                id="address"
                name="address"
                placeholder={labels.addressPlaceholder}
                value={formData.address}
                onChange={onInputChange}
                required
                className="bg-white/50 shadow-inner"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-muted-foreground">{labels.phoneOptional}</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder={labels.phonePlaceholder}
                  value={formData.phone}
                  onChange={onInputChange}
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-semibold text-muted-foreground">{labels.websiteOptional}</Label>
                <Input
                  id="website"
                  name="website"
                  placeholder={labels.websitePlaceholder}
                  value={formData.website}
                  onChange={onInputChange}
                  className="bg-white/50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-bold">{labels.presentation}</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">{labels.descriptionLabel}</Label>
            <Textarea
              id="description"
              name="description"
              placeholder={labels.descriptionPlaceholder}
              value={formData.description}
              onChange={onInputChange}
              className="min-h-[120px] bg-white/50"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
          <div className="flex gap-2">
            <Button variant="ghost" asChild className="text-muted-foreground">
              <Link href="/claim">{labels.cancel}</Link>
            </Button>
          </div>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {!canProceedToStep2 && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-[10px] text-amber-600 font-medium">
                  <Info className="h-3 w-3" />
                  {labels.requiredHint}
                </div>
                {missingStep1Fields.length > 0 ? (
                  <p className="text-[9px] text-amber-500/80 font-bold max-w-[250px] text-right">
                    {missingStep1Message}
                  </p>
                ) : null}
              </div>
            )}
            <Button type="button" onClick={onNext} disabled={!canProceedToStep2} size="lg" className="w-full sm:w-auto group">
              {labels.next}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClaimBenefitsStep({
  benefits,
  selectedAmenities,
  onAmenityToggle,
  onBack,
  onNext,
  labels,
}: {
  benefits: ReadonlyArray<{ group: string; icon?: string; amenities: readonly string[] }>;
  selectedAmenities: readonly string[];
  onAmenityToggle: (amenity: string) => void;
  onBack: () => void;
  onNext: () => void;
  labels: {
    title: string;
    description: string;
    benefitsTitle: string;
    back: string;
    next: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold">{labels.benefitsTitle}</h3>
          </div>
          <div className="grid gap-6">
            {benefits.map((group) => (
              <div key={group.group}>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  {group.icon || '-'} {group.group}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-2">
                  {group.amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className={cn(
                        'flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer hover:bg-white select-none relative group',
                        selectedAmenities.includes(amenity)
                          ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                          : 'bg-gray-50/50 border-gray-200 hover:border-gray-300',
                      )}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAmenityToggle(amenity);
                      }}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                          selectedAmenities.includes(amenity)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white border-gray-300 group-hover:border-primary/50',
                        )}
                      >
                        {selectedAmenities.includes(amenity) ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium transition-colors',
                          selectedAmenities.includes(amenity) ? 'text-primary' : 'text-gray-600',
                        )}
                      >
                        {amenity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4 border-t">
          <Button type="button" variant="ghost" onClick={onBack} className="text-muted-foreground">
            {labels.back}
          </Button>
          <Button type="button" onClick={onNext} size="lg" className="w-full sm:w-auto group">
            {labels.next}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClaimIdentityProofStep({
  formData,
  claimerTypeOptions,
  filteredProofMethods,
  selectedProofMethods,
  documentMethodSelected,
  videoMethodSelected,
  proofData,
  missingStep3Fields,
  missingStep3Message,
  canSubmit,
  onInputChange,
  onSelectChange,
  onProofMethodToggle,
  onDocumentUpload,
  onVideoUpload,
  onBack,
  onNext,
  labels,
}: {
  formData: ClaimFormData;
  claimerTypeOptions: readonly { value: string; label: string }[];
  filteredProofMethods: readonly ProofMethod[];
  selectedProofMethods: readonly string[];
  documentMethodSelected: boolean;
  videoMethodSelected: boolean;
  proofData: ProofData;
  missingStep3Fields: readonly string[];
  missingStep3Message: string;
  canSubmit: boolean;
  onInputChange: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onProofMethodToggle: (value: string) => void;
  onDocumentUpload: (file: File) => void;
  onVideoUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
  labels: {
    title: string;
    description: string;
    representativeTitle: string;
    representativeDescription: string;
    fullName: string;
    fullNamePlaceholder: string;
    position: string;
    positionPlaceholder: string;
    claimerType: string;
    claimerTypePlaceholder: string;
    claimerTitle: string;
    claimerTitlePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    personalPhone: string;
    personalPhonePlaceholder: string;
    verificationTitle: string;
    verificationDescription: string;
    documentUploadTitle: string;
    documentUploadCta: string;
    documentUploadHint: string;
    documentReady: string;
    videoUploadTitle: string;
    videoUploadCta: string;
    videoUploadHint: string;
    videoReady: string;
    submitHint: string;
    back: string;
    next: string;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{labels.representativeTitle}</h3>
              <p className="text-xs text-muted-foreground">{labels.representativeDescription}</p>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-semibold">{labels.fullName} *</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder={labels.fullNamePlaceholder}
                value={formData.fullName}
                onChange={onInputChange}
                onInput={onInputChange}
                required
                className="bg-white/50"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-semibold">{labels.position} *</Label>
                <Input
                  id="position"
                  name="position"
                  placeholder={labels.positionPlaceholder}
                  value={formData.position}
                  onChange={onInputChange}
                  onInput={onInputChange}
                  required
                  className="bg-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="claimerType" className="text-sm font-semibold">{labels.claimerType} *</Label>
                <Select name="claimerType" value={formData.claimerType} onValueChange={(value) => onSelectChange('claimerType', value)}>
                  <SelectTrigger className="bg-white/50">
                    <SelectValue placeholder={labels.claimerTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {claimerTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.claimerType === 'other' ? (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="claimerTitle" className="text-sm font-semibold">{labels.claimerTitle} *</Label>
                  <Input
                    id="claimerTitle"
                    name="claimerTitle"
                    placeholder={labels.claimerTitlePlaceholder}
                    value={formData.claimerTitle}
                    onChange={onInputChange}
                    onInput={onInputChange}
                    required
                    className="bg-white/50"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">{labels.email} *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={labels.emailPlaceholder}
                  value={formData.email}
                  onChange={onInputChange}
                  onInput={onInputChange}
                  required
                  className="bg-white/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personalPhone" className="text-sm font-semibold">{labels.personalPhone} *</Label>
              <Input
                id="personalPhone"
                name="personalPhone"
                placeholder={labels.personalPhonePlaceholder}
                value={formData.personalPhone}
                onChange={onInputChange}
                onInput={onInputChange}
                required
                className="bg-white/50"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6 bg-blue-50/30 -mx-6 px-6 py-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{labels.verificationTitle}</h3>
              <p className="text-xs text-muted-foreground">{labels.verificationDescription}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {filteredProofMethods.map((method) => (
              <div
                key={method.value}
                className={cn(
                  'border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/40 select-none',
                  selectedProofMethods.includes(method.value)
                    ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20'
                    : 'bg-white border-gray-200',
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onProofMethodToggle(method.value);
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      selectedProofMethods.includes(method.value) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    {method.value === 'email' ? <Mail className="h-4 w-4" /> : null}
                    {method.value === 'phone' ? <Phone className="h-4 w-4" /> : null}
                    {method.value === 'document' ? <Upload className="h-4 w-4" /> : null}
                    {method.value === 'video' ? <Loader2 className="h-4 w-4" /> : null}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm leading-tight">{method.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-1">{method.description}</p>
                  </div>
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5',
                      selectedProofMethods.includes(method.value)
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white border-gray-300',
                    )}
                  >
                    {selectedProofMethods.includes(method.value) ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 mt-4">
            {documentMethodSelected ? (
              <div className="border rounded-lg p-5 bg-white shadow-sm border-blue-200">
                <Label className="font-bold text-sm block mb-3">{labels.documentUploadTitle}</Label>
                <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50/50 transition-all block border-blue-200 mb-2">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-semibold">{labels.documentUploadCta}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{labels.documentUploadHint}</p>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onDocumentUpload(file);
                    }}
                  />
                </label>
                {proofData.documentFile ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{labels.documentReady.replace('{name}', proofData.documentFile.name)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {videoMethodSelected ? (
              <div className="border rounded-lg p-5 bg-white shadow-sm border-blue-200">
                <Label className="font-bold text-sm block mb-3">{labels.videoUploadTitle}</Label>
                <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50/50 transition-all block border-blue-200 mb-2">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-semibold">{labels.videoUploadCta}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{labels.videoUploadHint}</p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onVideoUpload(file);
                    }}
                  />
                </label>
                {proofData.videoFile ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{labels.videoReady.replace('{name}', proofData.videoFile.name)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
          <Button type="button" variant="ghost" onClick={onBack} className="text-muted-foreground">
            {labels.back}
          </Button>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {!canSubmit ? (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-[10px] text-amber-600 font-medium max-w-[250px] text-right">
                  <Info className="h-3 w-3 shrink-0" />
                  <span>{labels.submitHint}</span>
                </div>
                {missingStep3Fields.length > 0 ? (
                  <p className="text-[9px] text-amber-500/80 font-bold max-w-[250px] text-right">
                    {missingStep3Message}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button type="button" onClick={onNext} disabled={!canSubmit} size="lg" className="w-full sm:w-auto group">
              {labels.next}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClaimReviewSubmitStep({
  formData,
  claimerTypeLabel,
  selectedAmenities,
  selectedProofMethodLabels,
  hiddenInputs,
  isSubmitting,
  canSubmit,
  submitState,
  errorMessage,
  onBack,
  labels,
}: {
  formData: ClaimFormData & { priceLevel?: string; messageToAdmin?: string };
  claimerTypeLabel?: string;
  selectedAmenities: readonly string[];
  selectedProofMethodLabels: readonly string[];
  hiddenInputs: ReactNode;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitState: 'idle' | 'success' | 'error';
  errorMessage?: string;
  onBack: () => void;
  labels: {
    title: string;
    description: string;
    business: string;
    representative: string;
    selectedBenefits: string;
    selectedMethods: string;
    commitmentTitle: string;
    commitmentBody: string;
    back: string;
    submitting: string;
    sent: string;
    confirm: string;
  };
}) {
  return (
    <Card className="border-primary/20 shadow-xl overflow-hidden">
      <div className="bg-primary p-6 text-white">
        <CardTitle className="text-2xl">{labels.title}</CardTitle>
        <CardDescription className="text-primary-foreground/80">{labels.description}</CardDescription>
      </div>
      <CardContent className="p-8 space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{labels.business}</p>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="font-bold text-lg">{formData.businessName}</p>
                <p className="text-sm text-muted-foreground">{formData.address}, {formData.city}</p>
                <div className="mt-2 text-[10px] font-bold py-0.5 px-2 bg-blue-100 text-blue-700 rounded-full w-fit">
                  {formData.category}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{labels.representative}</p>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="font-bold">{formData.fullName}</p>
                <p className="text-sm text-muted-foreground">{formData.position}</p>
                <p className="text-sm text-muted-foreground">
                  {claimerTypeLabel}
                  {formData.claimerType === 'other' && formData.claimerTitle ? ` - ${formData.claimerTitle}` : ''}
                </p>
                <p className="text-sm font-medium mt-1">{formData.email}</p>
              </div>
            </div>
          </div>
        </div>

        {selectedAmenities.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{labels.selectedBenefits}</p>
            <div className="flex flex-wrap gap-2 text-sm italic">
              {selectedAmenities.map((amenity) => (
                <Badge key={amenity} variant="outline" className="px-2 py-0.5 bg-blue-50/30">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{labels.selectedMethods}</p>
          <div className="flex flex-wrap gap-2 text-sm italic">
            {selectedProofMethodLabels.map((label) => (
              <Badge key={label} variant="secondary" className="px-3 py-1 bg-green-50 text-green-700 border-green-100">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3 shadow-sm">
          <p className="font-bold text-amber-900 flex items-center gap-2">
            <Info className="h-5 w-5" />
            {labels.commitmentTitle}
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">{labels.commitmentBody}</p>
        </div>

        {hiddenInputs}

        <div className="flex flex-col sm:flex-row justify-between pt-6 border-t gap-4">
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting || submitState === 'success'} className="text-muted-foreground font-semibold">
            {labels.back}
          </Button>
          <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
            {submitState === 'error' && errorMessage ? (
              <p className="text-xs text-destructive font-bold bg-destructive/5 px-2 py-1 rounded border border-destructive/10">
                {errorMessage}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={isSubmitting || !canSubmit || submitState === 'success'}
              size="lg"
              className="w-full sm:w-auto px-10 bg-gradient-to-r from-primary to-blue-700 hover:shadow-lg transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {labels.submitting}
                </>
              ) : submitState === 'success' ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {labels.sent}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {labels.confirm}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
