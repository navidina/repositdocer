import { Router } from 'express';
import { indexDocuments, updateProjectDocs } from './controllers/scanController';
import { searchDocuments } from './controllers/searchController';
import { getProjectDocs } from './controllers/docsController';
import { askQuestion } from './controllers/integrationController';
import { apiKeyAuth } from './middlewares/auth';

const router = Router();

// Vector Store operations
router.post('/vectors/index', indexDocuments);
router.post('/rag/search', searchDocuments);

// Project operations
router.post('/projects/:id/docs', updateProjectDocs);
router.get('/projects/:id/docs', getProjectDocs);

/**
 * @swagger
 * /api/v1/ask:
 *   post:
 *     summary: پرسش از مستندات یک پروژه (RAG)
 *     description: این سرویس یک سوال را دریافت کرده و بر اساس مستندات تولید شده در پروژه مشخص شده، بهترین پاسخ را به همراه منابع برمی‌گرداند.
 *     tags: [Integration]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - question
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: شناسه (UUID) پروژه‌ای که قبلاً اسکن شده است.
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               question:
 *                 type: string
 *                 description: سوال کاربر درباره کدها یا معماری پروژه.
 *                 example: "چگونه وضعیت سبد خرید در این برنامه مدیریت می‌شود؟"
 *               topK:
 *                 type: integer
 *                 description: تعداد منابع (تکه‌های کد) که برای یافتن جواب بررسی می‌شوند. پیش‌فرض 5 است.
 *                 example: 5
 *     responses:
 *       200:
 *         description: پاسخ هوش مصنوعی با موفقیت تولید شد.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                   description: جواب تولید شده توسط هوش مصنوعی.
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: لیست فایل‌هایی که جواب از آنها استخراج شده است.
 *                 confidence_score:
 *                   type: number
 *                   description: درصد اطمینان به منبع (بین 0 تا 1).
 *       400:
 *         description: خطای درخواست کاربر (عدم ارسال projectId یا question).
 *       401:
 *         description: کلید API نامعتبر است (Unauthorized).
 *       500:
 *         description: خطای داخلی سرور یا اتصال به دیتابیس/Ollama.
 */
router.post('/v1/ask', apiKeyAuth, askQuestion);

export default router;
