const prisma = require("../prisma/config");

const isManager = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || (user.role !== 'MANAGER' && user.role !== 'SUPERADMIN')) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Manager role required."
            });
        }

        const manager = await prisma.manager.findFirst({
            where: {
                user_id: userId,
                deleted: false
            },
            select: {
                id: true,
                parking_spot_id: true,
                approved: true
            }
        });

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: "Manager record not found"
            });
        }

        if (!manager.approved) {
            return res.status(403).json({
                success: false,
                message: "Manager account not yet approved"
            });
        }

        req.manager = manager;
        next();
    } catch (error) {
        console.error("Error in manager middleware:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = isManager;