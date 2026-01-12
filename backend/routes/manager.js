const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const isManager = require("../middleware/isManager");
const router = express.Router();
const prisma = require("../prisma/config");

router.get("/daily-stats", authenticateToken, isManager, async (req, res) => {
    try {
        const parkingSpotId = req.manager.parking_spot_id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const activeCars = await prisma.parkedCar.findMany({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                status: {
                    not: 'RETRIEVED'
                },
                parked_at: {
                    gte: today,
                    lt: tomorrow
                }
            },
            select: {
                id: true,
                status: true,
                parked_pos: true,
                parked_at: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        license_plate: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                parked_at: 'desc'
            }
        });

        const totalCarsCount = await prisma.parkedCar.count({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                parked_at: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        const revenueResult = await prisma.payment.aggregate({
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

        res.status(200).json({
            success: true,
            message: "Daily statistics fetched successfully",
            data: {
                parking_spot: parkingSpot,
                summary: {
                    active_cars_count: activeCars.length,
                    total_cars_today: totalCarsCount,
                    revenue_today: parseFloat(revenueResult._sum.amount || 0)
                },
                active_cars: activeCars,
            }
        });
    } catch (error) {
        console.error("Error fetching daily stats:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/parked-cars", authenticateToken, isManager, async (req, res) => {
    try {
        const parkingSpotId = req.manager.parking_spot_id;
        const { page = 1, limit = 10, keyword = '', status = '' } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const pageLimit = parseInt(limit);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const where = {
            parking_spot_id: parkingSpotId,
            deleted: false,
            parked_at: {
                gte: today,
                lt: tomorrow
            }
        };

        if (status) {
            where.status = status;
        }

        if (keyword) {
            where.OR = [
                {
                    car: {
                        license_plate: {
                            contains: keyword,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    user: {
                        name: {
                            contains: keyword,
                            mode: 'insensitive'
                        }
                    }
                }
            ];
        }

        const parkedCarsRaw = await prisma.parkedCar.findMany({
            where,
            orderBy: {
                parked_at: 'desc'
            },
            skip: offset,
            take: pageLimit,
            select: {
                id: true,
                status: true,
                parked_pos: true,
                parked_at: true,
                retrieved_at: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        license_plate: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                },
                payments: {
                    where: { deleted: false },
                    take: 1,
                    select: {
                        amount: true,
                        payment_type: true,
                        status: true
                    }
                }
            }
        });

        const countsWhere = {
            parking_spot_id: parkingSpotId,
            deleted: false,
            parked_at: {
                gte: today,
                lt: tomorrow
            }
        };

        if (keyword) {
            countsWhere.OR = [
                {
                    car: {
                        license_plate: {
                            contains: keyword,
                            mode: 'insensitive'
                        }
                    }
                },
                {
                    user: {
                        name: {
                            contains: keyword,
                            mode: 'insensitive'
                        }
                    }
                }
            ];
        }

        const [
            totalItems,
            parkingCount,
            parkedCount,
            retrieveCount,
            retrievedCount
        ] = await Promise.all([
            prisma.parkedCar.count({ where: countsWhere }),
            prisma.parkedCar.count({ where: { ...countsWhere, status: 'PARKING' } }),
            prisma.parkedCar.count({ where: { ...countsWhere, status: 'PARKED' } }),
            prisma.parkedCar.count({ where: { ...countsWhere, status: 'RETRIEVE' } }),
            prisma.parkedCar.count({ where: { ...countsWhere, status: 'RETRIEVED' } })
        ]);

        const totalPages = Math.ceil(totalItems / pageLimit);

        const parkedCars = parkedCarsRaw.map(pc => ({
            ...pc,
            driver: pc.driver ? {
                id: pc.driver.id,
                name: pc.driver.user.name,
                phone: pc.driver.user.phone
            } : null,
            payment: pc.payments[0] || null,
            payments: undefined
        }));

        res.status(200).json({
            success: true,
            message: "Parked cars fetched successfully",
            data: {
                cars: parkedCars,
                counts: {
                    all: totalItems,
                    parking: parkingCount,
                    parked: parkedCount,
                    retrieve: retrieveCount,
                    retrieved: retrievedCount
                },
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: totalItems,
                    items_per_page: pageLimit
                }
            }
        });
    } catch (error) {
        console.error("Error fetching parked cars:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/drivers", authenticateToken, isManager, async (req, res) => {
    try {
        const parkingSpotId = req.manager.parking_spot_id;

        const drivers = await prisma.driver.findMany({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                approved: true
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                user: {
                    name: 'asc'
                }
            }
        });

        res.status(200).json({
            success: true,
            message: "Drivers fetched successfully",
            data: drivers
        });
    } catch (error) {
        console.error("Error fetching drivers:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.put("/assign-driver", authenticateToken, isManager, async (req, res) => {
    try {
        const parkingSpotId = req.manager.parking_spot_id;
        const { parked_car_id, driver_id } = req.body;

        if (!parked_car_id) {
            return res.status(400).json({
                success: false,
                message: "Parked car ID is required"
            });
        }

        const parkedCar = await prisma.parkedCar.findFirst({
            where: {
                id: parked_car_id,
                deleted: false
            },
            select: {
                id: true,
                parking_spot_id: true,
                status: true
            }
        });

        if (!parkedCar) {
            return res.status(404).json({
                success: false,
                message: "Parked car not found"
            });
        }

        if (parkedCar.parking_spot_id !== parkingSpotId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. This parked car does not belong to your parking spot"
            });
        }

        if (driver_id) {
            const driver = await prisma.driver.findFirst({
                where: {
                    id: driver_id,
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
                    message: "Driver not found"
                });
            }

            if (!driver.approved) {
                return res.status(400).json({
                    success: false,
                    message: "Driver is not approved"
                });
            }

            if (driver.parking_spot_id !== parkingSpotId) {
                return res.status(403).json({
                    success: false,
                    message: "Driver does not belong to your parking spot"
                });
            }
        }

        const updatedCar = await prisma.parkedCar.update({
            where: {
                id: parked_car_id
            },
            data: {
                driver_id: driver_id || null
            },
            select: {
                id: true,
                status: true,
                parked_pos: true,
                parked_at: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        license_plate: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                driver: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        const responseData = {
            ...updatedCar,
            driver: updatedCar.driver ? {
                id: updatedCar.driver.id,
                name: updatedCar.driver.user.name,
                phone: updatedCar.driver.user.phone
            } : null
        };

        res.status(200).json({
            success: true,
            message: driver_id ? "Driver assigned successfully" : "Driver unassigned successfully",
            data: responseData
        });
    } catch (error) {
        console.error("Error assigning driver:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/add-driver", authenticateToken, isManager, async (req, res) => {
    try {
        const parkingSpotId = req.manager.parking_spot_id;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email,
                deleted: false
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User with this email not found"
            });
        }

        const existingDriver = await prisma.driver.findFirst({
            where: {
                user_id: user.id,
                deleted: false
            }
        });

        if (existingDriver) {
            return res.status(400).json({
                success: false,
                message: "User is already a driver"
            });
        }

        const newDriver = await prisma.driver.create({
            data: {
                user_id: user.id,
                parking_spot_id: parkingSpotId,
                approved: false
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            message: "Driver added successfully",
            data: newDriver
        });

    } catch (error) {
        console.error("Error adding driver:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


module.exports = router;
