import express from 'express';
import cors from 'cors';
import router from './routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }', // Hide top bar for cleaner look
  customSiteTitle: "مستندات API رایان",
}));

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
