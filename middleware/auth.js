module.exports = function requireAuth(req, res, next) {
    if(!req.session.userId){
        console.log("no req.session.userId found")
        return res.redirect('login');
    }
    next();
}