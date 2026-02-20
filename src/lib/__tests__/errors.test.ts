import { describe, it, expect, vi } from 'vitest';
import {
  createErrorResponse,
  createSuccessResponse,
  handleDatabaseError,
  handleValidationError,
  handleAuthenticationError,
  handleAuthorizationError,
  handleFileUploadError,
  handleServerError,
  ErrorCode,
} from '../errors';

describe('Error Handling', () => {
  describe('createErrorResponse', () => {
    it('should create error response with code and message', () => {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input'
      );
      expect(response).toEqual({
        status: 'error',
        message: 'Invalid input',
        code: ErrorCode.VALIDATION_ERROR,
      });
    });

    it('should include details when provided', () => {
      const response = createErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { field: 'email' }
      );
      expect(response.details).toEqual({ field: 'email' });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with message', () => {
      const response = createSuccessResponse('Operation successful');
      expect(response).toEqual({
        status: 'success',
        message: 'Operation successful',
      });
    });

    it('should include data when provided', () => {
      const data = { id: '123', name: 'Test' };
      const response = createSuccessResponse('Success', data);
      expect(response.data).toEqual(data);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle duplicate key errors', () => {
      const error = { message: 'duplicate key value violates unique constraint' };
      const response = handleDatabaseError(error);
      expect(response.code).toBe(ErrorCode.CONFLICT);
      expect(response.message.toLowerCase()).toContain('existe');
    });

    it('should handle not found errors', () => {
      const error = { message: 'No rows returned' };
      const response = handleDatabaseError(error);
      expect(response.code).toBe(ErrorCode.NOT_FOUND);
      expect(response.message).toContain('not found');
    });

    it('should handle permission errors', () => {
      const error = { message: 'permission denied' };
      const response = handleDatabaseError(error);
      expect(response.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
      expect(response.message).toContain('permission');
    });

    it('should handle generic database errors', () => {
      const error = { message: 'Connection failed' };
      const response = handleDatabaseError(error);
      expect(response.code).toBe(ErrorCode.DATABASE_ERROR);
    });
  });

  describe('handleValidationError', () => {
    it('should create validation error response', () => {
      const fieldErrors = { email: ['Invalid email'], password: ['Too short'] };
      const response = handleValidationError('Validation failed', fieldErrors);
      expect(response.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.details?.fieldErrors).toEqual(fieldErrors);
    });
  });

  describe('handleAuthenticationError', () => {
    it('should create authentication error response', () => {
      const response = handleAuthenticationError('Invalid credentials');
      expect(response.code).toBe(ErrorCode.AUTHENTICATION_ERROR);
      expect(response.message).toBe('Invalid credentials');
    });

    it('should use default message when not provided', () => {
      const response = handleAuthenticationError();
      expect(response.message).toContain('Authentication failed');
    });
  });

  describe('handleAuthorizationError', () => {
    it('should create authorization error response', () => {
      const response = handleAuthorizationError('Access denied');
      expect(response.code).toBe(ErrorCode.AUTHORIZATION_ERROR);
      expect(response.message).toBe('Access denied');
    });
  });

  describe('handleFileUploadError', () => {
    it('should create file upload error response', () => {
      const response = handleFileUploadError('Upload failed');
      expect(response.code).toBe(ErrorCode.FILE_UPLOAD_ERROR);
      expect(response.message).toBe('Upload failed');
    });
  });

  describe('handleServerError', () => {
    it('should create server error response', () => {
      const error = new Error('Internal server error');
      const consoleSpy = vi.spyOn(console, 'error');
      const response = handleServerError(error);
      
      expect(response.code).toBe(ErrorCode.SERVER_ERROR);
      expect(response.message).toContain('unexpected error');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
