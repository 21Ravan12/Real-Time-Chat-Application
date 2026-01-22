import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from '../utils/logger.js';
import cookieParser from 'cookie-parser';
import path from 'path';

export const configureServer = (app) => {
  app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }));

  // Set CORS headers for static image responses BEFORE static middleware
  app.use('/img', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });
  
  app.use('/img', express.static(path.join(process.cwd(), 'public/img')));
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add this before your routes
  app.use(cookieParser());

  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    logger.error(`Server error: ${err.stack}`);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  });
};
