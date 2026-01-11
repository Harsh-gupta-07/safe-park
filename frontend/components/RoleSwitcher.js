"use client";

import { User, Shield, Car, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from 'next/navigation'

export default function RoleSwitcher() {
    const pathname = usePathname();

    const roles = [
        { id: "user", label: "User", icon: User },
        { id: "manager", label: "Manager", icon: Shield },
        { id: "driver", label: "Driver", icon: Car },
        { id: "super-admin", label: "Super Admin", icon: Crown },
    ];

    return (
        <div className="fixed left-0 top-0 h-screen z-50">
            <ul className="menu bg-white text-base-content w-24 h-full p-2 pt-6 shadow-2xl gap-2 shadow-black/10 justify-start">
                <li className="menu-title text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 p-0 mb-1">
                    Login As
                </li>
                {roles.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname == "/" ? item.id == "user" : pathname.includes(item.id);
                    return (
                        <li key={item.id}>
                            <Link
                                href={`/${item.id == "user" ? "" : item.id}`}
                                className={`flex flex-col items-center gap-1 p-3 rounded-2xl! h-auto transition-all duration-200 ${isActive
                                    ? "active bg-indigo-600 text-white! shadow-lg shadow-indigo-200"
                                    : "hover:bg-slate-50 text-black hover:shadow-lg hover:shadow-black/10"
                                    }`}
                            >
                                <Icon size={22} strokeWidth={2.5} />
                                <span className="text-[10px] font-bold text-center leading-tight">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
