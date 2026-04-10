const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  if (req.user.role !== 'admin') {
    console.log('Admin access denied for:', req.user.email, 'Role:', req.user.role);
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  
  console.log('Admin access granted for:', req.user.email);
  next();
};

module.exports = admin;