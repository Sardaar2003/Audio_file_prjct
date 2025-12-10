const roleMiddleware = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Authentication required');
  }

  if (!allowedRoles.includes(req.user.role)) {
    res.status(403);
    throw new Error('You do not have access to this resource');
  }

  next();
};

module.exports = roleMiddleware;


