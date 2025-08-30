// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});

app.use('/api/', limiter);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000', 'http://api:5000'] 
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// PostgreSQL connection with better error handling
// const pool = new Pool({
//   user: process.env.DB_USER || 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   database: process.env.DB_NAME || 'ticketing_system',
//   password: process.env.DB_PASSWORD || 'Raj@2025',
//   port: process.env.DB_PORT || 5432,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });
const pool = new Pool({
  connectionString: 'postgresql://ticketing_system_h2jh_user:aZzzcT2yzyMDO6RuhpbuXV4KcvoBdFdR@dpg-d2pd0kf5r7bs739i81k0-a.oregon-postgres.render.com/ticketing_system_h2jh' ,
  ssl: { rejectUnauthorized: false }  // Often required for hosted DBs
});

// Test database connection with retry logic
const connectWithRetry = async (retries = 5) => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    client.release();
  } catch (err) {
    console.error(`❌ Database connection failed. Retries left: ${retries - 1}`);
    console.error('Error:', err.message);
    
    if (retries > 1) {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(() => connectWithRetry(retries - 1), 5000);
    } else {
      console.error('❌ Failed to connect to database after all retries');
      process.exit(1);
    }
  }
};

connectWithRetry();

// Validation functions
const validateTicketData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate || data.title !== undefined) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    } else if (data.title.trim().length > 200) {
      errors.push('Title must not exceed 200 characters');
    }
  }
  
  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      errors.push('Description is required');
    } else if (data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    } else if (data.description.trim().length > 2000) {
      errors.push('Description must not exceed 2000 characters');
    }
  }
  
  if (data.priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(data.priority)) {
      errors.push('Priority must be low, medium, or high');
    }
  }
  
  if (data.status !== undefined) {
    if (!['open', 'inprogress', 'closed'].includes(data.status)) {
      errors.push('Status must be open, inprogress, or closed');
    }
  }
  
  return errors;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

// Database query wrapper with error handling
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Routes

// GET /api/getAllTickets - Get all tickets with optional filtering
app.get('/api/getAllTickets', async (req, res) => {
  try {
    const { search, status, priority, limit = 1000, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (search) {
      query += ` AND (LOWER(title) LIKE $${paramCount} OR LOWER(description) LIKE $${paramCount})`;
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }
    
    if (status && status !== 'all') {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (priority && priority !== 'all') {
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await executeQuery(query, params);
    
    res.json({
      tickets: result.rows,
      total: result.rowCount,
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      totalPages: Math.ceil(result.rowCount / parseInt(limit))
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tickets. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/createTicket - Create a new ticket
app.post('/api/createTicket', async (req, res) => {
  try {
    const { title, description, priority = 'medium' } = req.body;
    
    // Sanitize inputs
    const sanitizedData = {
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      priority: priority.toLowerCase().trim()
    };
    
    // Validate input
    const validationErrors = validateTicketData(sanitizedData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO tickets (title, description, priority, status, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [sanitizedData.title, sanitizedData.description, sanitizedData.priority, 'open']
    );
    
    console.log(`✅ Ticket created successfully: ID ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Ticket with similar data already exists' });
    }
    
    res.status(500).json({ 
      error: 'Failed to create ticket. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/ticket/:id - Update a ticket
app.put('/api/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status } = req.body;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }
    
    // Check if ticket exists
    const existingTicket = await executeQuery('SELECT * FROM tickets WHERE id = $1', [id]);
    
    if (existingTicket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Sanitize inputs
    const updates = {};
    if (title !== undefined) updates.title = sanitizeInput(title);
    if (description !== undefined) updates.description = sanitizeInput(description);
    if (priority !== undefined) updates.priority = priority.toLowerCase().trim();
    if (status !== undefined) updates.status = status.toLowerCase().trim();
    
    // Validate updates
    const validationErrors = validateTicketData(updates, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(`${key} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const updateQuery = `
      UPDATE tickets 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramCounter} 
      RETURNING *
    `;
    
    const result = await executeQuery(updateQuery, values);
    
    console.log(`✅ Ticket updated successfully: ID ${id}`);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ 
      error: 'Failed to update ticket. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ticket/:id - Get a specific ticket
app.get('/api/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }
    
    const result = await executeQuery('SELECT * FROM tickets WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ 
      error: 'Failed to fetch ticket. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/ticket/:id - Delete a ticket (optional)
app.delete('/api/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }
    
    const result = await executeQuery('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    console.log(`✅ Ticket deleted successfully: ID ${id}`);
    res.json({ 
      message: 'Ticket deleted successfully', 
      ticket: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ 
      error: 'Failed to delete ticket. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await executeQuery('SELECT 1');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'Connected',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: 'Database connection failed'
    });
  }
});

// Get ticket statistics
app.get('/api/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open,
        COUNT(CASE WHEN status = 'inprogress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
      FROM tickets
    `;
    
    const result = await executeQuery(statsQuery);
    
    res.json({
      total: parseInt(result.rows[0].total),
      status: {
        open: parseInt(result.rows[0].open),
        inProgress: parseInt(result.rows[0].in_progress),
        closed: parseInt(result.rows[0].closed)
      },
      priority: {
        high: parseInt(result.rows[0].high_priority),
        medium: parseInt(result.rows[0].medium_priority),
        low: parseInt(result.rows[0].low_priority)
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Input validation middleware
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => {
      const value = req.body[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: [`Required fields: ${missingFields.join(', ')}`]
      });
    }
    
    next();
  };
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ Error occurred: ${err.stack}`);
  
  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON format in request body',
      details: ['Please check your request format']
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Request too large',
      details: ['Maximum file size exceeded']
    });
  }
  
  // Database connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Database connection failed',
      details: ['Service temporarily unavailable']
    });
  }
  
  // Generic server error
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? [err.message] : ['Something went wrong on our end']
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    details: [`The requested endpoint ${req.method} ${req.originalUrl} does not exist`]
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  
  try {
    await pool.end();
    console.log('📦 Database connection pool closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM. Shutting down gracefully...');
  
  try {
    await pool.end();
    console.log('📦 Database connection pool closed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

module.exports = app;