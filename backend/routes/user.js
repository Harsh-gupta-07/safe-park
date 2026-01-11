const express = require("express");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
const prisma = require("../prisma/config");

router.get("/profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                deleted: false
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                created_at: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: user
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/recent-parked-cars", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        const totalCount = await prisma.parkedCar.count({
            where: {
                user_id: userId,
                deleted: false
            }
        });
        const totalPages = Math.ceil(totalCount / limit);

        const recentParkedCarsRaw = await prisma.parkedCar.findMany({
            where: {
                user_id: userId,
                deleted: false
            },
            orderBy: {
                created_at: 'desc'
            },
            skip: offset,
            take: limit,
            select: {
                id: true,
                status: true,
                parked_at: true,
                retrieved_at: true,
                created_at: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        license_plate: true
                    }
                },
                parking_spot: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        capacity: true
                    }
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        payment_type: true,
                        status: true,
                        created_at: true
                    },
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
                    }
                }
            }
        });

        const recentParkedCars = recentParkedCarsRaw.map(pc => ({
            ...pc,
            payment: pc.payments[0] || null,
            payments: undefined // Remove array
        }));

        res.status(200).json({
            success: true,
            message: "Recent parked cars fetched successfully",
            data: recentParkedCars,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.error("Error fetching paginated parked cars:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/add-car", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { brand, model, license_plate } = req.body;

        if (!brand || !model || !license_plate) {
            return res.status(400).json({
                success: false,
                message: "brand, model, and license_plate are required"
            });
        }


        const newCar = await prisma.car.create({
            data: {
                brand,
                model,
                license_plate,
                user_id: userId
            },
            select: {
                id: true,
                brand: true,
                model: true,
                license_plate: true,
                created_at: true
            }
        });

        res.status(201).json({
            success: true,
            message: "Car added successfully",
            data: newCar
        });
    } catch (error) {
        console.error("Error adding car:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.post("/park-car", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { car_id, parking_spot_id, amount, payment_type, payment_status } = req.body;

        if (!car_id || !parking_spot_id || !amount || !payment_type || !payment_status) {
            return res.status(400).json({
                success: false,
                message: "car_id, parking_spot_id, amount, payment_type, and payment_status are required"
            });
        }

        const validPaymentTypes = ['CASH', 'NET_BANKING', 'UPI', 'CARD'];
        if (!validPaymentTypes.includes(payment_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment_type. Must be one of: CASH, NET_BANKING, UPI, CARD"
            });
        }

        const car = await prisma.car.findFirst({
            where: {
                id: car_id,
                user_id: userId,
                deleted: false
            }
        });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: "Car not found or does not belong to the user"
            });
        }

        const parkingSpot = await prisma.parkingSpot.findFirst({
            where: {
                id: parking_spot_id,
                deleted: false
            }
        });

        if (!parkingSpot) {
            return res.status(404).json({
                success: false,
                message: "Parking spot not found"
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const level = Math.floor(Math.random() * 2) + 1;
            const section = String.fromCharCode(65 + Math.floor(Math.random() * 6));
            const spotNumber = String(Math.floor(Math.random() * 10) + 1).padStart(2, '0');
            const parked_pos = `Level ${level} - ${section}${spotNumber}`;

            const parkedCar = await tx.parkedCar.create({
                data: {
                    car_id,
                    user_id: userId,
                    parking_spot_id,
                    status: 'PARKING',
                    parked_pos
                },
                select: {
                    id: true,
                    car_id: true,
                    parking_spot_id: true,
                    status: true,
                    parked_pos: true,
                    parked_at: true,
                    created_at: true
                }
            });

            const payment = await tx.payment.create({
                data: {
                    user_id: userId,
                    parked_car_id: parkedCar.id,
                    amount,
                    payment_type,
                    status: payment_status
                },
                select: {
                    id: true,
                    amount: true,
                    payment_type: true,
                    status: true,
                    created_at: true
                }
            });

            return { parkedCar, payment };
        });

        res.status(201).json({
            success: true,
            message: "Car parked and payment initiated successfully",
            data: {
                parked_car: result.parkedCar,
                payment: result.payment
            }
        });
    } catch (error) {
        console.error("Error parking car:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.put("/update-profile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { email, name, phone } = req.body;

        if (!email || !name || !phone) {
            return res.status(400).json({
                success: false,
                message: "email, name, and phone are required"
            });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                id: userId,
                deleted: false
            }
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                email,
                name,
                phone
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                updated_at: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.put("/update-car/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const carId = req.params.id;
        const { brand, model, license_plate } = req.body;

        if (!brand || !model || !license_plate) {
            return res.status(400).json({
                success: false,
                message: "brand, model, and license_plate are required"
            });
        }

        const existingCar = await prisma.car.findFirst({
            where: {
                id: carId,
                user_id: userId,
                deleted: false
            }
        });

        if (!existingCar) {
            return res.status(404).json({
                success: false,
                message: "Car not found or does not belong to the user"
            });
        }

        const updatedCar = await prisma.car.update({
            where: { id: carId },
            data: {
                brand,
                model,
                license_plate
            },
            select: {
                id: true,
                brand: true,
                model: true,
                license_plate: true,
                updated_at: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Car updated successfully",
            data: updatedCar
        });
    } catch (error) {
        console.error("Error updating car:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.delete("/delete-car/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const carId = req.params.id;

        const existingCar = await prisma.car.findFirst({
            where: {
                id: carId,
                user_id: userId,
                deleted: false
            }
        });

        if (!existingCar) {
            return res.status(404).json({
                success: false,
                message: "Car not found or does not belong to the user"
            });
        }

        await prisma.car.update({
            where: { id: carId },
            data: { deleted: true }
        });

        res.status(200).json({
            success: true,
            message: "Car deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting car:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/cars", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const cars = await prisma.car.findMany({
            where: {
                user_id: userId,
                deleted: false
            },
            orderBy: {
                created_at: 'desc'
            },
            select: {
                id: true,
                brand: true,
                model: true,
                license_plate: true,
                created_at: true
            }
        });

        res.status(200).json({
            success: true,
            message: "Cars fetched successfully",
            data: cars
        });
    } catch (error) {
        console.error("Error fetching cars:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/payments", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const paymentsRaw = await prisma.payment.findMany({
            where: {
                user_id: userId,
                deleted: false
            },
            orderBy: {
                created_at: 'desc'
            },
            select: {
                id: true,
                amount: true,
                payment_type: true,
                status: true,
                created_at: true,
                parked_car: {
                    select: {
                        parking_spot: {
                            select: {
                                location: true,
                                name: true
                            }
                        },
                        car: {
                            select: {
                                brand: true,
                                model: true,
                                license_plate: true
                            }
                        }
                    }
                }
            }
        });

        const payments = paymentsRaw.map(p => ({
            id: p.id,
            amount: p.amount,
            payment_type: p.payment_type,
            status: p.status,
            created_at: p.created_at,
            parking_location: p.parked_car?.parking_spot?.location,
            car_brand: p.parked_car?.car?.brand,
            car_model: p.parked_car?.car?.model,
            car_license_plate: p.parked_car?.car?.license_plate,
            parking_spot_name: p.parked_car?.parking_spot?.name
        }));

        res.status(200).json({
            success: true,
            message: "Payments fetched successfully",
            data: payments
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.get("/active-parked-car", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const activeParkedCarRaw = await prisma.parkedCar.findFirst({
            where: {
                user_id: userId,
                deleted: false,
                status: {
                    not: 'RETRIEVED'
                }
            },
            orderBy: {
                created_at: 'asc'
            },
            select: {
                id: true,
                status: true,
                parked_at: true,
                parked_pos: true,
                created_at: true,
                car: {
                    select: {
                        id: true,
                        brand: true,
                        model: true,
                        license_plate: true
                    }
                },
                parking_spot: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        capacity: true
                    }
                },
                payments: {
                    select: {
                        id: true,
                        amount: true,
                        payment_type: true,
                        status: true,
                        created_at: true
                    },
                    take: 1
                }
            }
        });

        if (!activeParkedCarRaw) {
            return res.status(404).json({
                success: false,
                message: "No active parked car found",
                data: []
            });
        }

        const activeParkedCar = {
            ...activeParkedCarRaw,
            payment: activeParkedCarRaw.payments[0] || null,
            payments: undefined
        };


        res.status(200).json({
            success: true,
            message: "Active parked car fetched successfully",
            data: activeParkedCar
        });
    } catch (error) {
        console.error("Error fetching active parked car:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.put("/retrieve-car/:id", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const parkedCarId = req.params.id;

        const existingParkedCar = await prisma.parkedCar.findFirst({
            where: {
                id: parkedCarId,
                user_id: userId,
                deleted: false
            }
        });

        if (!existingParkedCar) {
            return res.status(404).json({
                success: false,
                message: "Parked car not found or does not belong to the user"
            });
        }

        const updatedParkedCar = await prisma.parkedCar.update({
            where: { id: parkedCarId },
            data: { status: 'RETRIEVE' },
            select: {
                id: true,
                status: true,
                updated_at: true
            }
        });



        res.status(200).json({
            success: true,
            message: "Car retrieval requested successfully",
            data: updatedParkedCar
        });
    } catch (error) {
        console.error("Error requesting car retrieval:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


module.exports = router;
