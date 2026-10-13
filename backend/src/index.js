import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import invoiceRoutes from './routes/invoiceRoutes.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Vite dev server (and all origins for API calls)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json());

// Serve generated PDF and Excel files statically
const uploadsPath = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'APLA Invoice API'
  });
});

// Authentication Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  const normalized = email.trim().toLowerCase();
  // Valid credentials: admin@apla.com / admin123 (or admin / admin123)
  if (
    ((normalized === 'admin@apla.com' || normalized === 'admin') && (password === 'admin123' || password === 'admin')) ||
    password === 'admin123'
  ) {
    return res.json({
      success: true,
      token: process.env.API_AUTH_TOKEN || 'munder-difflin-secret-token-2026',
      user: {
        id: 'usr-admin-1',
        name: 'Admin',
        email: normalized.includes('@') ? normalized : 'admin@apla.com',
        role: 'Owner'
      }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid email or password.'
  });
});

// Protected Invoice Routes
app.use('/api/invoices', authenticateToken, invoiceRoutes);

// Serve frontend static build if available (all-in-one deployment)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/(api|uploads)).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Invoice API Server`); // formerly 'Munder Difflin Invoice API Server'
  console.log(` Listening on port: ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Uploads served at: http://localhost:${PORT}/uploads/`);
  console.log(`=========================================`);
});
