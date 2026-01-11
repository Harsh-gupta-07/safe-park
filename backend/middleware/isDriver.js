const prisma = require("../prisma/config");

const isDriver = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || (user.role !== 'DRIVER' && user.role !== 'SUPERADMIN' && user.role !== 'MANAGER')) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Driver role required."
            });
        }

        const driver = await prisma.driver.findFirst({
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

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver record not found"
            });
        }

        if (!driver.approved) {
            return res.status(403).json({
                success: false,
                message: "Driver account not yet approved"
            });
        }

        req.driver = driver;
        next();
    } catch (error) {
        console.error("Error in driver middleware:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = isDriver;
