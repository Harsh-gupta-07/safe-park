const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const isDriver = require("../middleware/isDriver");
const router = express.Router();
const prisma = require("../prisma/config");


router.get("/parking-cars", authenticateToken, isDriver, async (req, res) => {
    try {
        const parkingSpotId = req.driver.parking_spot_id;
        const driverId = req.driver.id;
        const parkedCars = await prisma.parkedCar.findMany({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                status: { in: ['PARKING', 'RETRIEVE'] },
                driver_id: driverId
            },
            orderBy: {
                parked_at: 'desc'
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
            }
        });

        res.status(200).json({
            success: true,
            message: "Parking cars fetched successfully",
            data: parkedCars
        });
    } catch (error) {
        console.error("Error fetching parking cars:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


router.get("/unassigned-cars", authenticateToken, isDriver, async (req, res) => {
    try {
        const parkingSpotId = req.driver.parking_spot_id;

        const unassignedCars = await prisma.parkedCar.findMany({
            where: {
                parking_spot_id: parkingSpotId,
                deleted: false,
                driver_id: null,
                status: { not: 'RETRIEVED' }
            },
            orderBy: {
                parked_at: 'desc'
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
            }
        });

        res.status(200).json({
            success: true,
            message: "Unassigned parking cars fetched successfully",
            data: unassignedCars
        });
    } catch (error) {
        console.error("Error fetching unassigned cars:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});



router.put("/update-status/:parkedCarId", authenticateToken, isDriver, async (req, res) => {
    try {
        const { parkedCarId } = req.params;
        const { status } = req.body;
        const driverId = req.driver.id;

        const validStatuses = ['PARKING', 'PARKED', 'RETRIEVE', 'RETRIEVED'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be one of: PARKING, PARKED, RETRIEVE, RETRIEVED"
            });
        }



        const existingCar = await prisma.parkedCar.findFirst({
            where: {
                id: parkedCarId,
                deleted: false
            }
        });

        if (!existingCar) {
            return res.status(404).json({
                success: false,
                message: "Parked car not found"
            });
        }

        const dataToUpdate = {
            status: status,
            driver_id: driverId
        };

        if (status === 'RETRIEVED') {
            dataToUpdate.retrieved_at = new Date();
        }

        const updatedCar = await prisma.parkedCar.update({
            where: { id: parkedCarId },
            data: dataToUpdate
        });

        res.status(200).json({
            success: true,
            message: "Parked car status updated successfully",
            data: updatedCar
        });
    } catch (error) {
        console.error("Error updating parked car status:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

router.put("/assign/:parkedCarId", authenticateToken, isDriver, async (req, res) => {
    try {
        const { parkedCarId } = req.params;
        const driverId = req.driver.id;

        const car = await prisma.parkedCar.findFirst({
            where: {
                id: parkedCarId,
                deleted: false
            }
        });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: "Parked car not found"
            });
        }

        if (car.driver_id !== null) {
            return res.status(400).json({
                success: false,
                message: "This car is already assigned to a driver"
            });
        }

        const updatedCar = await prisma.parkedCar.update({
            where: { id: parkedCarId },
            data: {
                driver_id: driverId
            }
        });

        res.status(200).json({
            success: true,
            message: "Assignment accepted successfully",
            data: updatedCar
        });
    } catch (error) {
        console.error("Error assigning driver:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});


module.exports = router;

