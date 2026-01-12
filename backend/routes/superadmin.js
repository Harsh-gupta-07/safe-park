const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const isSuperAdmin = require("../middleware/isSuperAdmin");
const router = express.Router();
const prisma = require("../prisma/config");

router.get("/parking-spots", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const parkingSpots = await prisma.parkingSpot.findMany({
            where: {
                deleted: false
            },
            select: {
                id: true,
                name: true,
                location: true,
                capacity: true
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            message: "Parking spots fetched successfully",
            data: parkingSpots
        });
    } catch (error) {
        console.error("Error fetching parking spots:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/overview/:parkingSpotId", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { parkingSpotId } = req.params;

        const parkingSpot = await prisma.parkingSpot.findUnique({
            where: {
                id: parkingSpotId,
                deleted: false
            },
            select: {
                id: true,
                name: true,
                location: true,
                capacity: true
            }
        });

        if (!parkingSpot) {
            return res.status(404).json({
                success: false,
                message: "Parking spot not found"
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayTicketsCount = await prisma.parkedCar.count({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                parked_at: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        const todayCollectionResult = await prisma.payment.aggregate({
            _sum: {
                amount: true
            },
            where: {
                parked_car: {
                    parking_spot_id: parkingSpotId
                },
                deleted: false,
                status: 'COMPLETED',
                created_at: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        const totalTicketsCount = await prisma.parkedCar.count({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false
            }
        });

        const totalCollectionResult = await prisma.payment.aggregate({
            _sum: {
                amount: true
            },
            where: {
                parked_car: {
                    parking_spot_id: parkingSpotId
                },
                deleted: false,
                status: 'COMPLETED'
            }
        });

        const activeParkingCount = await prisma.parkedCar.count({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                status: {
                    in: ['PARKING', 'PARKED', 'RETRIEVE']
                }
            }
        });

        res.status(200).json({
            success: true,
            message: "Overview statistics fetched successfully",
            data: {
                parking_spot: parkingSpot,
                todays_performance: {
                    tickets_issued: todayTicketsCount,
                    collection: parseFloat(todayCollectionResult._sum.amount || 0)
                },
                overall_statistics: {
                    total_tickets: totalTicketsCount,
                    total_collection: parseFloat(totalCollectionResult._sum.amount || 0),
                    active_parking: activeParkingCount
                }
            }
        });
    } catch (error) {
        console.error("Error fetching overview statistics:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/pending-approvals", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const pendingManagers = await prisma.manager.findMany({
            where: {
                approved: false,
                deleted: false
            },
            select: {
                id: true,
                created_at: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                parking_spot: {
                    select: {
                        id: true,
                        name: true,
                        location: true
                    }
                }
            },
            orderBy: {
                created_at: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            message: "Pending managers fetched successfully",
            data: pendingManagers
        });
    } catch (error) {
        console.error("Error fetching pending managers:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/pending-drivers", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const pendingDrivers = await prisma.driver.findMany({
            where: {
                approved: false,
                deleted: false
            },
            select: {
                id: true,
                created_at: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                },
                parking_spot: {
                    select: {
                        id: true,
                        name: true,
                        location: true
                    }
                }
            },
            orderBy: {
                created_at: 'asc'
            }
        });

        res.status(200).json({
            success: true,
            message: "Pending drivers fetched successfully",
            data: pendingDrivers
        });
    } catch (error) {
        console.error("Error fetching pending drivers:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/approve-manager/:managerId", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { managerId } = req.params;

        const existingManager = await prisma.manager.findFirst({
            where: {
                id: managerId,
                deleted: false
            }
        });

        if (!existingManager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        await prisma.manager.update({
            where: {
                id: managerId
            },
            data: {
                approved: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Manager approved successfully"
        });
    } catch (error) {
        console.error("Error approving manager:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/reject-manager/:managerId", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { managerId } = req.params;

        const existingManager = await prisma.manager.findFirst({
            where: {
                id: managerId,
                deleted: false
            }
        });

        if (!existingManager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        await prisma.manager.update({
            where: {
                id: managerId
            },
            data: {
                deleted: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Manager rejected successfully"
        });
    } catch (error) {
        console.error("Error rejecting manager:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/approve-driver/:driverId", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;

        const existingDriver = await prisma.driver.findFirst({
            where: {
                id: driverId,
                deleted: false
            }
        });

        if (!existingDriver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        await prisma.driver.update({
            where: {
                id: driverId
            },
            data: {
                approved: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Driver approved successfully"
        });
    } catch (error) {
        console.error("Error approving driver:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/reject-driver/:driverId", authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { driverId } = req.params;

        const existingDriver = await prisma.driver.findFirst({
            where: {
                id: driverId,
                deleted: false
            }
        });

        if (!existingDriver) {
            return res.status(404).json({
                success: false,
                message: "Driver not found"
            });
        }

        await prisma.driver.update({
            where: {
                id: driverId
            },
            data: {
                deleted: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Driver rejected successfully"
        });
    } catch (error) {
        console.error("Error rejecting driver:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;
