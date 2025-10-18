// src/routes/auth.js - FIXED VERSION
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.get('/debug/all-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        userTenants: {
          include: {
            tenant: true
          }
        }
      }
    });

    res.json({
      totalUsers: users.length,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        tenants: user.userTenants.map(ut => ({
          id: ut.tenant.id,
          name: ut.tenant.name,
          role: ut.role
        }))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userTenants: {  
          include: {
            tenant: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenants: user.userTenants.map(ut => ({ 
          id: ut.tenant.id,
          name: ut.tenant.name,
          shopifyDomain: ut.tenant.shopifyDomain,
          isActive: ut.tenant.isActive,
          createdAt: ut.tenant.createdAt,
          updatedAt: ut.tenant.updatedAt,
          role: ut.role
        }))
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        tenants: req.user.userTenants.map(ut => ({  
          id: ut.tenant.id,
          name: ut.tenant.name,
          shopifyDomain: ut.tenant.shopifyDomain,
          isActive: ut.tenant.isActive,
          createdAt: ut.tenant.createdAt,
          updatedAt: ut.tenant.updatedAt,
          role: ut.role
        }))
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

router.get('/debug/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { email: decodeURIComponent(email) },
      include: {
        userTenants: { 
          include: {
            tenant: true
          }
        }
      }
    });

    if (user) {
      res.json({
        found: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          hasPassword: !!user.password,
          tenantsCount: user.userTenants.length,
          tenants: user.userTenants.map(ut => ({
            id: ut.tenant.id,
            name: ut.tenant.name,
            shopifyDomain: ut.tenant.shopifyDomain,
            role: ut.role
          }))
        }
      });
    } else {
      res.json({ found: false, email });
    }
  } catch (error) {
    console.error('Debug route error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});
router.delete('/debug/delete-all', async (req, res) => {
  try {
   
    await prisma.userTenant.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.user.deleteMany({});

    res.json({ message: 'All users and tenants deleted' });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ error: 'Failed to delete everything' });
  }
});

module.exports = router;