const Joi = require('joi');
const logger = require('../utils/logger');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Validation error:', { errors, path: req.path });
      
      return res.status(400).json({
        error: 'Validation error',
        details: errors
      });
    }
    
    req[property] = value;
    next();
  };
};

const schemas = {
  // Publication schemas
  createPublication: Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    rss_url: Joi.string().uri().max(500).required(),
    website_url: Joi.string().uri().max(500).optional(),
    logo_url: Joi.string().uri().max(500).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().max(100).optional()
  }),

  updatePublication: Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    rss_url: Joi.string().uri().max(500).optional(),
    website_url: Joi.string().uri().max(500).optional(),
    logo_url: Joi.string().uri().max(500).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().max(100).optional(),
    is_active: Joi.boolean().optional()
  }),

  // Query parameters
  articlesQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    publication_id: Joi.number().integer().min(1).optional(),
    is_read: Joi.boolean().optional(),
    is_saved: Joi.boolean().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    search: Joi.string().max(100).optional()
  }),

  searchQuery: Joi.object({
    q: Joi.string().trim().min(1).max(100).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  }),

  // User action schemas
  markReadRequest: Joi.object({
    is_read: Joi.boolean().required()
  }),

  markSavedRequest: Joi.object({
    is_saved: Joi.boolean().required()
  }),

  bulkMarkReadRequest: Joi.object({
    article_ids: Joi.array().items(Joi.number().integer().min(1)).min(1).max(100).required()
  }),

  // User registration/login
  registerUser: Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(6).max(255).required(),
    first_name: Joi.string().trim().max(100).optional(),
    last_name: Joi.string().trim().max(100).optional()
  }),

  loginUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

module.exports = {
  validate,
  schemas
};
