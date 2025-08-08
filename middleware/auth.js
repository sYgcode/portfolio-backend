// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (roles = []) => {
  return (req, res, next) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      
      if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Ensure decoded token has required fields
      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Invalid token format.' });
      }

      // Set user information on request object
      req.user = {
        id: decoded.id || decoded._id,
        email: decoded.email,
        role: decoded.role,
        username: decoded.username
      };

      // Check role permissions if specified
      if (roles.length > 0) {
        if (!decoded.role || !roles.includes(decoded.role)) {
          return res.status(403).json({ 
            message: 'Access denied. Insufficient permissions.',
            required: roles,
            userRole: decoded.role 
          });
        }
      }

      console.log('Auth successful for user:', req.user.id, 'Role:', req.user.role);
      next();
      
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token.' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired.' });
      } else {
        return res.status(401).json({ message: 'Token verification failed.' });
      }
    }
  };
};