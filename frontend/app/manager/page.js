"use client";

import { Search, Phone, Car, Clock, MapPin, User, RefreshCw, ChevronLeft, IndianRupee, CheckCircle, UserPlus, AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import LoadingScreen from "../../components/LoadingScreen";
import ErrorScreen from "../../components/ErrorScreen";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

export default function page() {
    const { isLoading, error: authError } = useAuth();
    const [activeTab, setActiveTab] = useState("all");
    const [assigningDriver, setAssigningDriver] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingCars, setLoadingCars] = useState(false);
    const [error, setError] = useState(null);
    const [modalError, setModalError] = useState(null);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [addDriverEmail, setAddDriverEmail] = useState("");
    const [addingDriver, setAddingDriver] = useState(false);

    const [stats, setStats] = useState({
        activeCars: 0,
        retrieving: 0,
        totalToday: 0,
        revenue: 0,
    });

    const [parkingSpot, setParkingSpot] = useState(null);
    const [vehicles, setVehicles] = useState([]);
    const [drivers, setDrivers] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [statusCounts, setStatusCounts] = useState({
        all: 0,
        parking: 0,
        parked: 0,
        retrieve: 0,
        retrieved: 0
    });

    const fetchDailyStats = async () => {
        try {
            setError(null);
            const token = sessionStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/manager/daily-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch daily stats');

            const result = await response.json();
            if (result.success) {
                setParkingSpot(result.data.parking_spot);
                setStats({
                    activeCars: result.data.summary.active_cars_count,
                    retrieving: result.data.active_cars.filter(car => car.status === 'RETRIEVING').length,
                    totalToday: result.data.summary.total_cars_today,
                    revenue: result.data.summary.revenue_today,
                });
            }
        } catch (error) {
            console.error('Error fetching daily stats:', error);
            setError(error.message);
        }
    };

    const fetchParkedCars = async (page = 1, status = '', keyword = '') => {
        try {
            setLoadingCars(true);
            setError(null);
            const token = sessionStorage.getItem('authToken');

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
            });

            if (status && status !== 'all') {
                params.append('status', status.toUpperCase());
            }
            if (keyword) {
                params.append('keyword', keyword);
            }

            const response = await fetch(`${API_BASE_URL}/manager/parked-cars?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                setError('Failed to fetch parked cars');
                return;
            }

            const result = await response.json();
            if (result.success) {
                setVehicles(result.data.cars);
                if (result.data.counts) {
                    console.log(result.data.counts);
                    setStatusCounts(result.data.counts);
                }
                setCurrentPage(result.data.pagination.current_page);
                setTotalPages(result.data.pagination.total_pages);
                setTotalItems(result.data.pagination.total_items);
            } else {
                setError(result.message);
            }
        } catch (error) {
            console.error('Error fetching parked cars:', error);
            setError(error.message);
        } finally {
            setLoadingCars(false);
        }
    };

    const fetchDrivers = async () => {
        try {
            setError(null);
            const token = sessionStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/manager/drivers`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch drivers');

            const result = await response.json();
            if (result.success) {
                setDrivers(result.data);
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setError(error.message);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchDailyStats(),
                fetchDrivers(),
            ]);
            await fetchParkedCars(1, activeTab, searchQuery);
            setLoading(false);
        };
        const timer = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!loading) {
                fetchParkedCars(1, activeTab, searchQuery);
            }
        }, 500);
        return () => clearTimeout(timeout);
    }, [activeTab, searchQuery]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const calculateDuration = (parkedAt, retrievedAt) => {
        const endTime = retrievedAt ? new Date(retrievedAt) : new Date();
        const parked = new Date(parkedAt);
        const diffMs = endTime - parked;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const assignDriver = async (parkedCarId, driverId) => {
        try {
            setAssigningDriver(true);
            setError(null);
            const token = sessionStorage.getItem('authToken');

            const response = await fetch(`${API_BASE_URL}/manager/assign-driver`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parked_car_id: parkedCarId,
                    driver_id: driverId || null,
                }),
            });

            const result = await response.json();

            if (result.success) {
                await fetchParkedCars(currentPage, activeTab, searchQuery);
            } else {
                setError(result.message || 'Failed to assign driver');
            }
        } catch (error) {
            console.error('Error assigning driver:', error);
            setError('Failed to assign driver. Please try again.');
        } finally {
            setAssigningDriver(false);
        }
    };

    const handleAddDriver = async (e) => {
        e.preventDefault();
        try {
            setAddingDriver(true);
            setModalError(null);
            const token = sessionStorage.getItem('authToken');

            const response = await fetch(`${API_BASE_URL}/manager/add-driver`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: addDriverEmail,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setAddDriverEmail("");
                setIsAddDriverOpen(false);
                await fetchDrivers();
            } else {
                setModalError(result.message || 'Failed to add driver');
            }
        } catch (error) {
            console.error('Error adding driver:', error);
            setModalError('Failed to add driver. Please try again.');
        } finally {
            setAddingDriver(false);
        }
    };

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (authError) {
        return <ErrorScreen error={authError} />;
    }

    return (
        <div className="pb-32 bg-slate-50 min-h-screen">
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-screen">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                    <p className="text-slate-500 mt-4">Loading dashboard...</p>
                </div>
            ) : (
                <>
                    <div className="bg-white pt-4 pb-3 px-5 border-b border-slate-100 sticky top-0 z-20">
                        <div className="flex justify-between items-center">
                            <div className="flex justify-center items-center gap-2">
                                <button
                                    className="w-8 h-8 flex items-center justify-center"
                                >
                                    <ChevronLeft size={22} className="text-slate-800" />
                                </button>
                                <h1 className="text-slate-900 text-base font-semibold">Manager Dashboard</h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        await fetchDailyStats();
                                        await fetchParkedCars(currentPage, activeTab, searchQuery);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900"
                                    disabled={loading || loadingCars}
                                >
                                    <RefreshCw size={20} className={loadingCars ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={() => setIsAddDriverOpen(true)}
                                    className="w-28 h-8 cursor-pointer flex items-center justify-center text-slate-600 hover:text-slate-900 ml-2"
                                >
                                    <UserPlus size={22} className="mr-2" /> Add Driver
                                </button>
                            </div>

                        </div>
                        <p className="text-slate-500 text-xs mt-1 ml-10">Manage valet assignments and parking operations</p>
                    </div>

                    {error && (
                        <div className="px-5 mt-4">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <p className="text-sm text-red-600 mt-1">{error}</p>
                                </div>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-red-400 hover:text-red-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 px-5 mt-5">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-sm mb-1">Active Cars</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.activeCars}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-sm mb-1">Retrieving</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.retrieving}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-sm mb-1">Total Today</p>
                            <p className="text-3xl font-bold text-slate-900">{stats.totalToday}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <p className="text-slate-500 text-sm mb-1">Revenue</p>
                            <p className="text-3xl font-bold text-slate-900">₹{stats.revenue}</p>
                        </div>
                    </div>

                    <div className="px-5 mt-5">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by plate or customer."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white text-slate-900 placeholder-slate-400 pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-400"
                            />
                        </div>
                    </div>

                    <div className="flex px-5 mt-4 gap-2 overflow-x-auto scrollbar-hide">
                        {['all', 'parking', 'parked', 'retrieve', 'retrieved'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab) }}
                                className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${activeTab === tab
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({statusCounts[tab]})
                            </button>
                        ))}
                    </div>

                    <div className="px-5 mt-5 space-y-4">
                        {loadingCars ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                <p className="text-slate-500 mt-2">Loading vehicles...</p>
                            </div>
                        ) : vehicles.length === 0 ? (
                            <div className="text-center py-12">
                                <Car size={48} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500">No vehicles found</p>
                            </div>
                        ) : (
                            vehicles.map((vehicle) => (
                                <div
                                    key={vehicle.id}
                                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                                <Car size={20} className="text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">{vehicle.car.brand} {vehicle.car.model}</h4>
                                                        <p className="text-sm text-slate-500 font-mono">{vehicle.car.license_plate}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${vehicle.status === 'RETRIEVING'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : vehicle.status === 'RETRIEVED'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {vehicle.status.toLowerCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-xs text-slate-500">Customer</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 ml-6 mt-0.5">{vehicle.user.name}</p>
                                            <p className="text-xs text-slate-500 ml-6">{vehicle.user.phone}</p>
                                        </div>

                                        <div className="mt-4">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                <span className="text-xs text-slate-500">Valet Assigned</span>
                                            </div>
                                            <div className="flex items-center justify-between ml-6 mt-0.5">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{vehicle.driver?.name || "Not Assigned"}</p>
                                                    {vehicle.driver && (
                                                        <p className="text-xs text-slate-500">{vehicle.driver.phone}</p>
                                                    )}
                                                </div>
                                                {vehicle.driver && (
                                                    <a href={`tel:${vehicle.driver.phone}`} className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                                        <Phone size={18} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>


                                        <div className="mt-4">
                                            <label className="text-xs text-slate-500 mb-1 block">Assign Driver</label>
                                            <select

                                                value={vehicle.driver?.id || ''}
                                                onChange={(e) => {
                                                    const driverId = e.target.value
                                                    assignDriver(vehicle.id, driverId);
                                                }}
                                                disabled={assigningDriver || vehicle.status == 'RETRIEVED'}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400 disabled:opacity-50"
                                            >
                                                <option value="">Unassigned</option>
                                                {drivers.map((driver) => (
                                                    <option key={driver.id} value={driver.id}>
                                                        {driver.user.name} - {driver.user.phone}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>


                                        {parkingSpot && (
                                            <div className="mt-4">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    <span className="text-xs text-slate-500">Location</span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 ml-6 mt-0.5">{parkingSpot.name}</p>
                                                <p className="text-xs text-slate-500 ml-6">{parkingSpot.location}</p>
                                                {vehicle.parked_pos && (
                                                    <p className="text-xs text-slate-500 ml-6">Position: {vehicle.parked_pos}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                <span className="text-xs text-slate-500">Entry Time</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 ml-6 mt-0.5">{formatDate(vehicle.parked_at)}</p>
                                            <p className="text-xs text-slate-500 ml-6">Duration: {calculateDuration(vehicle.parked_at)}</p>
                                        </div>

                                        {vehicle.payment && (
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <IndianRupee size={14} className="text-slate-400" />
                                                            <span className="text-xs text-slate-500">Payment</span>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-900 ml-6 mt-0.5">₹{vehicle.payment.amount}</p>
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 ${vehicle.payment.status === 'COMPLETED'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {vehicle.payment.status === 'COMPLETED' && <CheckCircle size={12} />}
                                                        {vehicle.payment.status === 'COMPLETED' ? 'Paid' : 'Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {!loadingCars && vehicles.length > 0 && totalPages > 1 && (
                        <div className="px-5 mt-6 mb-8">
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                                <button
                                    onClick={() => fetchParkedCars(currentPage - 1, activeTab, searchQuery)}
                                    disabled={currentPage === 1}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === 1
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Previous
                                </button>
                                <div className="text-sm text-slate-600">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <button
                                    onClick={() => fetchParkedCars(currentPage + 1, activeTab, searchQuery)}
                                    disabled={currentPage === totalPages}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === totalPages
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isAddDriverOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => {
                                setIsAddDriverOpen(false);
                                setAddDriverEmail("");
                                setModalError(null);
                                setError(null);
                            }}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-slate-900 mb-1">Add New Driver</h2>
                        <p className="text-sm text-slate-500 mb-6">Enter the email address of the user you want to add as a driver.</p>
                        {modalError && (
                            <p className="text-sm text-red-500 mb-4">{modalError}</p>
                        )}
                        <form onSubmit={handleAddDriver}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={addDriverEmail}
                                    onChange={(e) => setAddDriverEmail(e.target.value)}
                                    placeholder="driver@example.com"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={addingDriver}
                                className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {addingDriver ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>AddingDriver...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        <span>Add Driver</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
