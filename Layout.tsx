
import React from 'react';
import { UserSession, UserRole } from '../types';
import { LogOut, Truck, ShieldCheck, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  user: UserSession;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                QuickLink
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                <span className="text-xs text-slate-500 uppercase flex items-center gap-1">
                  {user.role === UserRole.ADMIN ? <ShieldCheck className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                  {user.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} QuickLink Delivery System. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
