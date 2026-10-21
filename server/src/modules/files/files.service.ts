import fs from 'fs';
import path from 'path';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { NotFoundError, ForbiddenError, AppError } from '../../lib/errors';

// Ensure upload directory exists
if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

export class FilesService {
  /**
   * Save uploaded file record
   */
  static async saveFileRecord(params: {
    organizationId: string;
    uploadedById: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    filename: string;
  }) {
    const file = await prisma.fileObject.create({
      data: {
        organizationId: params.organizationId,
        uploadedById: params.uploadedById,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storageKey: params.filename,
      },
    });

    return file;
  }

  /**
   * Get file record and check tenant isolation
   */
  static async getFile(fileId: string, organizationId: string) {
    const file = await prisma.fileObject.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundError('File');
    }

    if (file.organizationId !== organizationId) {
      throw new ForbiddenError('Access denied to this file');
    }

    const filePath = path.resolve(env.UPLOAD_DIR, file.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('File content not found on server disk');
    }

    return { file, filePath };
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string, organizationId: string) {
    const { file, filePath } = await this.getFile(fileId, organizationId);

    // Delete disk file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Error removing disk file:', e);
    }

    // Delete DB record
    await prisma.fileObject.delete({
      where: { id: file.id },
    });

    return { success: true };
  }
}
