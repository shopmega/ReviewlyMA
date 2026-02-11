/**
 * Consolidated file upload and handling utilities
 * Eliminates duplication for proof file processing across claim operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ErrorCode, createErrorResponse } from './errors';

/**
 * Supported proof file types
 */
export type ProofFileType = 'document' | 'video' | 'logo' | 'cover' | 'gallery';

/**
 * File upload result
 */
export interface FileUploadResult {
  url: string;
  uploaded: boolean;
  error?: string;
}

/**
 * Configuration for file uploads
 */
export interface FileUploadConfig {
  bucket: string;
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

/**
 * Default file type configurations
 */
const FILE_TYPE_CONFIG: Record<ProofFileType, FileUploadConfig> = {
  document: {
    bucket: 'claim-proofs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  video: {
    bucket: 'claim-proofs',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  },
  logo: {
    bucket: 'claim-proofs',
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  cover: {
    bucket: 'claim-proofs',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  gallery: {
    bucket: 'claim-proofs',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

/**
 * Generate unique file path to prevent collisions
 * Uses timestamp + random string for uniqueness
 */
function generateUniqueFilePath(basePath: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${basePath}-${timestamp}-${random}.${extension}`;
}

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  fileType: ProofFileType
): { valid: boolean; error?: string } {
  const config = FILE_TYPE_CONFIG[fileType];

  if (!config) {
    return { valid: false, error: `Unknown file type: ${fileType}` };
  }

  if (config.maxFileSize && file.size > config.maxFileSize) {
    const maxSizeMB = Math.round(config.maxFileSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  if (config.allowedMimeTypes && !config.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed for ${fileType}. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Handle a single proof file (upload if new File, keep path if string)
 * Generic handler for all proof file types
 */
export async function handleProofFile(
  file: File | string | null | undefined,
  fileType: ProofFileType,
  claimId: string,
  supabaseClient: SupabaseClient
): Promise<FileUploadResult> {
  try {
    // No file provided
    if (!file) {
      return { url: '', uploaded: false };
    }

    // Already a path (string), return as-is
    if (typeof file === 'string') {
      return { url: file, uploaded: file.length > 0 };
    }

    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.valid) {
      return {
        url: '',
        uploaded: false,
        error: validation.error,
      };
    }

    // Upload new file
    const buffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop() || 'bin';
    const filePath = generateUniqueFilePath(
      `claims/${claimId}/${fileType}`,
      ext
    );

    const config = FILE_TYPE_CONFIG[fileType];
    const { error } = await supabaseClient.storage
      .from(config.bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return {
        url: '',
        uploaded: false,
        error: `Failed to upload ${fileType}: ${error.message}`,
      };
    }

    return {
      url: filePath,
      uploaded: true,
    };
  } catch (error: any) {
    return {
      url: '',
      uploaded: false,
      error: `Unexpected error uploading ${fileType}: ${error?.message}`,
    };
  }
}

/**
 * Handle multiple proof files in batch
 * Returns object with results for each file type
 */
export async function handleMultipleProofFiles(
  files: Partial<Record<ProofFileType, File | string | null>>,
  claimId: string,
  supabaseClient: SupabaseClient
): Promise<{
  results: Record<ProofFileType, FileUploadResult>;
  failedUploads: ProofFileType[];
  successfulUploads: ProofFileType[];
}> {
  const results: Record<ProofFileType, FileUploadResult> = {
    document: { url: '', uploaded: false },
    video: { url: '', uploaded: false },
    logo: { url: '', uploaded: false },
    cover: { url: '', uploaded: false },
    gallery: { url: '', uploaded: false },
  };

  const failedUploads: ProofFileType[] = [];
  const successfulUploads: ProofFileType[] = [];

  // Process each file type
  for (const [fileType, file] of Object.entries(files)) {
    const result = await handleProofFile(
      file as File | string | null,
      fileType as ProofFileType,
      claimId,
      supabaseClient
    );

    results[fileType as ProofFileType] = result;

    if (!result.uploaded) {
      failedUploads.push(fileType as ProofFileType);
    } else {
      successfulUploads.push(fileType as ProofFileType);
    }
  }

  return {
    results,
    failedUploads,
    successfulUploads,
  };
}

/**
 * Build JSONB updates from file upload results
 * Converts FileUploadResult objects into database update objects
 */
export function buildProofDataUpdates(
  results: Record<ProofFileType, FileUploadResult>
): Record<string, any> {
  const updates: Record<string, any> = {};

  if (results.document.uploaded) {
    updates.document_url = results.document.url;
    updates.document_uploaded = true;
  }

  if (results.video.uploaded) {
    updates.video_url = results.video.url;
    updates.video_uploaded = true;
  }

  if (results.logo.uploaded) {
    updates.logo_url = results.logo.url;
    updates.logo_uploaded = true;
  }

  if (results.cover.uploaded) {
    updates.cover_url = results.cover.url;
    updates.cover_uploaded = true;
  }

  if (results.gallery.uploaded) {
    updates.gallery_url = results.gallery.url;
    updates.gallery_uploaded = true;
  }

  return updates;
}

/**
 * Get user-friendly error message for file operation failures
 */
export function getFileErrorMessage(failedFiles: ProofFileType[]): string {
  if (failedFiles.length === 0) return '';

  const fileNames = failedFiles.join(', ');
  return `Failed to upload: ${fileNames}. Please check file types and sizes, then retry.`;
}
