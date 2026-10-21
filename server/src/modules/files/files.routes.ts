import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { FilesService } from './files.service';
import { authenticate, resolveOrganization } from '../../middleware/auth';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';

export const filesRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // 10MB default
  },
});

/**
 * POST /api/files/upload
 * Upload a single file
 */
filesRouter.post(
  '/upload',
  authenticate,
  resolveOrganization(),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError('No file provided', 400);
      }

      const fileRecord = await FilesService.saveFileRecord({
        organizationId: req.organizationId!,
        uploadedById: req.user!.userId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        filename: req.file.filename,
      });

      res.status(201).json({
        ...fileRecord,
        url: `/api/files/${fileRecord.id}/download`,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/files/:id/download
 * Download or view a file
 */
filesRouter.get(
  '/:id/download',
  authenticate,
  resolveOrganization(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.id as string;
      const { file, filePath } = await FilesService.getFile(fileId, req.organizationId!);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/files/:id
 * Delete a file
 */
filesRouter.delete(
  '/:id',
  authenticate,
  resolveOrganization(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params.id as string;
      const result = await FilesService.deleteFile(fileId, req.organizationId!);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
