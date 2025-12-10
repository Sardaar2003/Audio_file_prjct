   const asyncHandler = (fn) => (req, res, next) => {
     if (typeof next !== 'function') {
       console.error('No next() for route', req.method, req.originalUrl);
       return fn(req, res, () => {}); // temporary to avoid crashing
     }
     Promise.resolve(fn(req, res, next)).catch(next);
   };

module.exports = asyncHandler;


