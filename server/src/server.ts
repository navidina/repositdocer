import app from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Security Warning
if (!process.env.INTEGRATION_API_KEY) {
  console.warn('⚠️ WARNING: INTEGRATION_API_KEY is not set in environment variables! Integration API will reject all requests.');
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
});
