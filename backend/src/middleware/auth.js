// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');


const JWT_SECRET = process.env.JWT_SECRET || 'xeno-fde-secret-key-2025';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userTenants: {  
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const authenticateTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const userTenant = req.user.userTenants.find(ut => ut.tenantId === tenantId);
    
    if (!userTenant) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }

    req.tenant = userTenant.tenant;
    req.tenantRole = userTenant.role;
    next();
  } catch (error) {
    console.error('Tenant auth error:', error);
    return res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = {
  authenticateToken,
  authenticateTenant,
  JWT_SECRET
};