/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider, useAuth } from './context/AuthContext';
import { StaffPage } from './components/StaffPage';
import { AdminPage } from './components/AdminPage';
import { TicketStatusPage } from './components/TicketStatusPage';
import { LogOut, ShieldCheck, User as UserIcon, Loader2, ListTodo, PlusCircle, LifeBuoy } from 'lucide-react';
import { useState } from 'react';

function Navigation() {
  const { user, login, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'staff' | 'admin' | 'status'>('staff');
  const isAdminUser = user?.email === 'tukukalandi@gmail.com';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-indiapost-red" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-indiapost-red sticky top-0 z-50 shadow-md w-full">
        <div className="w-full px-2 sm:px-4">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
              <div className="flex flex-col">
                <span className="font-black text-base sm:text-lg text-white leading-none tracking-tight">PMV</span>
                <span className="font-bold text-[8px] sm:text-[10px] text-white/80 uppercase tracking-widest leading-none">Support Desk</span>
              </div>
              
              <div className="flex h-full ml-1 sm:ml-4">
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`px-2 sm:px-4 h-full flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold transition-all border-b-4 ${
                    activeTab === 'staff' 
                      ? 'border-white text-white' 
                      : 'border-transparent text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="whitespace-nowrap">Raise Ticket</span>
                </button>
                {user && (
                  <button
                    onClick={() => setActiveTab('status')}
                    className={`px-2 sm:px-4 h-full flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold transition-all border-b-4 ${
                      activeTab === 'status' 
                        ? 'border-white text-white' 
                        : 'border-transparent text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ListTodo className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="whitespace-nowrap">My Status</span>
                  </button>
                )}
                {isAdminUser && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-2 sm:px-4 h-full flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold transition-all border-b-4 ${
                      activeTab === 'admin' 
                        ? 'border-white text-white' 
                        : 'border-transparent text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="whitespace-nowrap">Admin Panel</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 ml-2">
              {user ? (
                <>
                  <div className="hidden md:flex flex-col items-end border-l border-white/20 pl-4">
                    <p className="text-sm font-bold text-white max-w-[100px] truncate">{user.displayName}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Account</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={login}
                  className="px-4 py-2 bg-white text-indiapost-red rounded-lg font-bold text-xs sm:text-sm hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Admin Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto">
        {activeTab === 'admin' && isAdminUser ? (
          <AdminPage />
        ) : activeTab === 'status' && user ? (
          <TicketStatusPage />
        ) : (
          <StaffPage />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}


