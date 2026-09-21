// Role-based access control middleware
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before verifying role.',
      });
    }

    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (!allowedRoles.map((r) => r.toLowerCase()).includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] role(s). Your role is '${userRole}'.`,
      });
    }

    next();
  };
};

module.exports = checkRole;
