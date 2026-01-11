"use client";

import DashboardUser from "../components/DashboardUser";
import BottomNav from "../components/BottomNav";
import { BottomNavStateProvider } from "./context/BottomNavContext";


export default function Home() {

  return (
    <BottomNavStateProvider>
      <DashboardUser />
      <BottomNav />
    </BottomNavStateProvider>
  );
}
