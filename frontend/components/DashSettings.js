"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import SettingsMain from "./SettingsMain";
import SettingsVehicles from "./SettingsVehicles";
import SettingsAddVehicle from "./SettingsAddVehicle";
import SettingsTransactions from "./SettingsTransactions";
import SettingsFAQ from "./SettingsFAQ";
import SettingsProfile from "./SettingsProfile";

export default function DashSettings() {
    const [activeView, setActiveView] = useState("home");
    const [editingVehicle, setEditingVehicle] = useState(null);

    const titles = {
        "home": "Settings",
        "vehicles": "Manage Vehicles",
        "transactions": "Transaction History",
        "faq": "FAQ",
        "add-vehicle": "Add New Vehicle",
        "edit-vehicle": "Edit Vehicle",
        "profile": "Edit Profile"
    };

    const subtitles = {
        "home": "Manage your account and preferences",
        "vehicles": "Your registered vehicles",
        "transactions": "View all payments",
        "faq": "Frequently Asked Questions",
        "add-vehicle": "Enter vehicle details",
        "edit-vehicle": "Update vehicle details",
        "profile": "Update your personal information",
    };

    const handleBack = () => {
        if (activeView === "add-vehicle" || activeView === "edit-vehicle") {
            setActiveView("vehicles");
            setEditingVehicle(null);
        } else if (activeView !== "home") {
            setActiveView("home");
        }
    };

    const handleEditVehicle = (vehicle) => {
        setEditingVehicle(vehicle);
    };

    return (
        <div className="pb-32 min-h-screen bg-slate-50">
            <div className="bg-indigo-600 pt-6 pb-6 px-6">
                <div className="flex items-center gap-4 mb-2">
                    <button className="text-white" onClick={handleBack}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-xl font-semibold text-white">{titles[activeView]}</h1>
                </div>
                <p className="text-indigo-200 text-sm ml-10">{subtitles[activeView]}</p>
            </div>

            {activeView === "home" && <SettingsMain setActiveView={setActiveView} />}
            {activeView === "vehicles" && <SettingsVehicles setActiveView={setActiveView} onEditVehicle={handleEditVehicle} />}
            {activeView === "transactions" && <SettingsTransactions setActiveView={setActiveView} />}
            {activeView === "faq" && <SettingsFAQ setActiveView={setActiveView} />}
            {activeView === "add-vehicle" && <SettingsAddVehicle setActiveView={setActiveView} />}
            {activeView === "edit-vehicle" && <SettingsAddVehicle setActiveView={setActiveView} editVehicle={editingVehicle} />}
            {activeView === "profile" && <SettingsProfile setActiveView={setActiveView} />}
        </div>
    );
}