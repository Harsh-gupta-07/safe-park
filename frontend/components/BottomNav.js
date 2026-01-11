"use client";

import { Home, Receipt, History, Settings } from "lucide-react";
import { useBottomNavState } from "../app/context/BottomNavContext";

export default function BottomNavWrapper() {
    const { activeView, setActiveView, showNav } = useBottomNavState();

    // if (!showNav) return null;

    const navItems = [
        { name: "Home", id: "home", icon: Home },
        { name: "Ticket", id: "ticket", icon: Receipt },
        { name: "History", id: "history", icon: History },
        { name: "Settings", id: "settings", icon: Settings },
    ];

    return (
        <div className="dock fixed z-50 bg-white w-[95%] max-w-md left-1/2 -translate-x-1/2 bottom-4 rounded-2xl shadow-2xl border border-base-200/50 backdrop-blur-md bg-opacity-90">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                    <button
                        key={item.id}
                        className={`${isActive ? "active text-primary" : "text-base-content/70"} bg-white`}
                        onClick={() => setActiveView(item.id)}
                    >
                        <Icon className={`h-5 w-5  ${isActive ? "text-primary" : "text-black"}`} />
                        <span className={`dock-label ${isActive ? "text-primary" : "text-black"} text-xs`}>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
