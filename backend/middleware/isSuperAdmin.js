const prisma = require("../prisma/config");


const isSuperAdmin = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || user.role !== 'SUPERADMIN') {
            return res.status(403).json({
                success: false,
                message: "Access denied. Super Admin role required."
            });
        }

        next();
    } catch (error) {
        console.error("Error in super admin middleware:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = isSuperAdmin;
