import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'رایان هم‌افزا - API مستندات هوشمند (RAG)',
      version: '1.0.0',
      description: 'وب‌سرویس اختصاصی برای پرسش و پاسخ از دانش سازمانی و کدهای مستندسازی شده. این API برای یکپارچه‌سازی با سایر محصولات شرکت طراحی شده است.',
      contact: {
        name: 'تیم زیرساخت هوش مصنوعی',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000', // در پروداکشن باید آدرس سرور واقعی را بگذارید
        description: 'سرور توسعه (Development)',
      },
    ],
    // تعریف سیستم احراز هویت (API Key)
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key', // هدر مورد انتظار در API شما
          description: 'کلید دسترسی سازمانی خود را وارد کنید.',
        },
      },
    },
    // اعمال احراز هویت روی تمام روت‌ها به صورت پیش‌فرض
    security: [{ ApiKeyAuth: [] }],
  },
  // مسیری که Swagger باید دنبال کامنت‌های JSDoc بگردد
  apis: ['./src/routes.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
