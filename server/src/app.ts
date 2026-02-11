import express from 'express';
import cors from 'cors';
import router from './routes';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
