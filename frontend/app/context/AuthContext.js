"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const autoLogin = async () => {
            try {
                let email = process.env.NEXT_PUBLIC_EMAIL;
                let password = process.env.NEXT_PUBLIC_PASSWORD;

                if (pathname.startsWith("/driver")) {
                    email = process.env.NEXT_PUBLIC_DRIVER_EMAIL;
                    password = process.env.NEXT_PUBLIC_DRIVER_PASSWORD;
                } else if (pathname.startsWith("/manager")) {
                    email = process.env.NEXT_PUBLIC_MANAGER_EMAIL;
                    password = process.env.NEXT_PUBLIC_MANAGER_PASSWORD;
                } else if (pathname.startsWith("/super-admin")) {
                    email = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
                    password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
                }

                if (user && user.email === email) {
                    setIsLoading(false);
                    return;
                }

                if (user && user.email !== email) {
                    sessionStorage.removeItem("authToken");
                    setUser(null);
                }

                setIsLoading(true);

                if (!email || !password) {
                    console.warn(`Auto-login credentials not found for path: ${pathname}`);
                    setError("Auto-login credentials not found");
                    setIsLoading(false);
                    return;
                }

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (data.success) {
                    sessionStorage.setItem("authToken", data.data.token);
                    setUser(data.data.user);
                } else {
                    setError(data.message);
                    console.error("Auto-login failed:", data.message);
                }
            } catch (err) {
                setError("Failed to connect to server");
                console.error("Auto-login error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        autoLogin();
    }, [pathname]);

    const logout = () => {
        sessionStorage.removeItem("authToken");
        setUser(null);
    };

    const getToken = () => {
        return sessionStorage.getItem("authToken");
    };

    return (
        <AuthContext.Provider value={{ isLoading, user, setUser, error, logout, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
