"use client";

import DashboardUser from "../components/DashboardUser";
import BottomNav from "../components/BottomNav";
import ErrorScreen from "../components/ErrorScreen";
import { BottomNavStateProvider } from "./context/BottomNavContext";
import { useAuth } from "./context/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

export default function Home() {
  const { isLoading, error } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  return (
    <BottomNavStateProvider>
      <DashboardUser />
      <BottomNav />
    </BottomNavStateProvider>
  );
}
