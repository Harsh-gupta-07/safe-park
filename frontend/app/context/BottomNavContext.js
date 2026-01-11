"use client";

import { createContext, useContext, useState } from "react";

const BottomNavStateContext = createContext();

export function BottomNavStateProvider({ children }) {
    const [activeView, setActiveView] = useState("home");
    const [showNav, setShowNav] = useState(true);
    const [showConfirmParking, setShowConfirmParkingState] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    return (
        <BottomNavStateContext.Provider value={{
            activeView,
            setActiveView,
            showNav,
            setShowNav,
            showConfirmParking,
            showScanner,
            setShowScanner,
            setShowConfirmParking: setShowConfirmParkingState
        }}>
            {children}
        </BottomNavStateContext.Provider>
    );
}

export function useBottomNavState() {
    const context = useContext(BottomNavStateContext);
    if (!context) {
        throw new Error("useBottomNavState must be used within BottomNavStateProvider");
    }
    return context;
}
