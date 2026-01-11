import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import RoleSwitcher from "../components/RoleSwitcher";

export const metadata = {
  title: "Smart Parking App",
  description: "Seamless parking experience",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 pl-32">
        <AuthProvider>
          {children}

          <RoleSwitcher />
        </AuthProvider>
      </body>
    </html>
  );
}
