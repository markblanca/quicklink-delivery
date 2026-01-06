
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, UserSession, Rider, Service, ServiceStatus, RiderStatus, Location, Customer } from './types';
import { getStoredRiders, saveRiders, getStoredServices, saveServices, getStoredCustomers, saveCustomers } from './services/storage';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import DeliveryDashboard from './components/DeliveryDashboard';
import { Truck, LogIn, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Auth state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const prevServicesCount = useRef(0);

  // Notification setup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sync notifications for delivery
  useEffect(() => {
    if (user?.role === UserRole.DELIVERY) {
      const cloudServices = services.filter((s: Service) => s.status === ServiceStatus.PENDING).length;
      if (cloudServices > prevServicesCount.current) {
        new Notification("¡Nuevo Servicio!", {
          body: `Hay ${cloudServices} servicios disponibles en la nube.`,
          icon: "/icon.png"
        });
        // Play simple notification sound if allowed
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
      prevServicesCount.current = cloudServices;
    }
  }, [services, user]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setRiders(await getStoredRiders());
      setServices(await getStoredServices());
      setCustomers(await getStoredCustomers());
      const initialServices = await getStoredServices();
      prevServicesCount.current = initialServices.filter((s: Service) => s.status === ServiceStatus.PENDING).length;
    };
    load();
    
    const savedUser = localStorage.getItem('quicklink_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Tracking logic
  useEffect(() => {
    if (user && user.role === UserRole.DELIVERY) {
      const currentRider = riders.find(r => r.id === user.id);
      
      if (currentRider?.isTracking) {
        if (!watchIdRef.current) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const location: Location = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                timestamp: pos.timestamp
              };
              setRiders(prev => prev.map(r => 
                r.id === user.id ? { ...r, location } : r
              ));
            },
            (err) => console.error("Geo error", err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
          );
        }
      } else {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [user, riders]);

  // Save changes to storage (asynchronous)
  useEffect(() => {
    if (riders.length > 0) saveRiders(riders);
  }, [riders]);

  useEffect(() => {
    saveServices(services);
  }, [services]);

  useEffect(() => {
    if (customers.length > 0) saveCustomers(customers);
  }, [customers]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'admin') {
      const session: UserSession = { id: 'admin', username: 'admin', role: UserRole.ADMIN, name: 'Administrador' };
      setUser(session);
      localStorage.setItem('quicklink_session', JSON.stringify(session));
      return;
    }

    const foundRider = riders.find(r => r.username === username && r.password === password);
    if (foundRider) {
      const session: UserSession = { id: foundRider.id, username: foundRider.username, role: UserRole.DELIVERY, name: foundRider.name };
      setUser(session);
      localStorage.setItem('quicklink_session', JSON.stringify(session));
      return;
    }

    setError('Usuario o contraseña incorrectos.');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('quicklink_session');
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const addRider = (newRider: Omit<Rider, 'id' | 'status' | 'lastStatusChange' | 'isTracking'>) => {
    const rider: Rider = {
      ...newRider,
      id: Math.random().toString(36).substring(7),
      status: RiderStatus.AVAILABLE,
      lastStatusChange: Date.now(),
      isTracking: false
    };
    setRiders([...riders, rider]);
  };

  const deleteRider = (id: string) => {
    setRiders(riders.filter(r => r.id !== id));
  };

  const addCustomer = (newCustomer: Omit<Customer, 'id'>) => {
    const customer: Customer = {
      ...newCustomer,
      id: Math.random().toString(36).substring(7)
    };
    setCustomers([...customers, customer]);
  };

  const deleteCustomer = (id: string) => {
    setCustomers(customers.filter(c => c.id !== id));
  };

  const addService = (newService: Omit<Service, 'id' | 'status' | 'createdAt'>) => {
    const service: Service = {
      ...newService,
      id: Math.random().toString(36).substring(7),
      status: newService.assignedToRiderId ? ServiceStatus.ASSIGNED : ServiceStatus.PENDING,
      createdAt: Date.now()
    };
    setServices([service, ...services]);
  };

  const deleteService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleImportData = (newData: { riders: Rider[], services: Service[], customers: Customer[] }) => {
    const merge = (oldArr: any[], newArr: any[]) => {
      const ids = new Set(oldArr.map(i => i.id));
      const additions = newArr.filter(i => !ids.has(i.id));
      return [...oldArr, ...additions];
    };

    setRiders(prev => merge(prev, newData.riders));
    setServices(prev => merge(prev, newData.services));
    setCustomers(prev => merge(prev, newData.customers));
  };

  const handleClearOldServices = () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = services.filter((s: Service) => {
      if (s.status !== ServiceStatus.COMPLETED) return true;
      return s.createdAt > thirtyDaysAgo;
    });
    setServices(filtered);
  };

  const updateRiderStatus = useCallback((riderId: string) => {
    setRiders(prev => prev.map(r => {
      if (r.id !== riderId) return r;
      const activeServices = services.filter(s => s.assignedToRiderId === riderId && (s.status === ServiceStatus.IN_PROGRESS || s.status === ServiceStatus.ASSIGNED));
      const newStatus = activeServices.length > 0 ? RiderStatus.BUSY : RiderStatus.AVAILABLE;
      
      if (newStatus !== r.status) {
        return { ...r, status: newStatus, lastStatusChange: Date.now() };
      }
      return r;
    }));
  }, [services]);

  const toggleTracking = (enabled: boolean) => {
    if (!user) return;
    setRiders(prev => prev.map(r => 
      r.id === user.id ? { ...r, isTracking: enabled } : r
    ));
  };

  const acceptServiceFromCloud = (serviceId: string) => {
    if (!user) return;
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, assignedToRiderId: user.id, status: ServiceStatus.ASSIGNED } : s
    ));
    updateRiderStatus(user.id);
  };

  const startService = (serviceId: string) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, status: ServiceStatus.IN_PROGRESS, startedAt: Date.now() } : s
    ));
  };

  const completeService = (serviceId: string) => {
    setServices(prev => prev.map(s => 
      s.id === serviceId ? { ...s, status: ServiceStatus.COMPLETED, completedAt: Date.now() } : s
    ));
    if (user) {
      setRiders(prev => prev.map(r => 
        r.id === user.id ? { ...r, lastCompletedAt: Date.now(), status: RiderStatus.AVAILABLE, lastStatusChange: Date.now() } : r
      ));
    }
  };

  useEffect(() => {
    if (user && user.role === UserRole.DELIVERY) {
      updateRiderStatus(user.id);
    }
  }, [services, user, updateRiderStatus]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-in zoom-in duration-300">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 mb-4 animate-bounce">
              <Truck className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">QuickLink</h1>
            <p className="text-slate-500 font-medium">Gestión Inteligente de Domicilios</p>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <LogIn className="w-5 h-5 text-indigo-500" />
              Ingreso al Portal
            </h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Usuario</label>
                <input required type="text" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" placeholder="repartidor_01" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                <input required type="password" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold border border-red-100">
                  <ShieldAlert className="w-4 h-4" />
                  {error}
                </div>
              )}
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95">
                Entrar
              </button>
            </form>
            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-400 font-medium italic">"Prueba con admin / admin"</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentRider = user.role === UserRole.DELIVERY ? riders.find(r => r.id === user.id) : null;

  return (
    <Layout user={user} onLogout={handleLogout}>
      {user.role === UserRole.ADMIN ? (
        <AdminDashboard
          riders={riders}
          services={services}
          customers={customers}
          onAddRider={addRider}
          onAddService={addService}
          onAddCustomer={addCustomer}
          onDeleteRider={deleteRider}
          onDeleteService={deleteService}
          onDeleteCustomer={deleteCustomer}
          onAssignService={(sId: string, rId: string) => {
            setServices(services.map(s => s.id === sId ? { ...s, assignedToRiderId: rId, status: ServiceStatus.ASSIGNED } : s));
          }}
          onImportData={handleImportData}
          onClearOldServices={handleClearOldServices}
        />
      ) : (
        currentRider && (
          <DeliveryDashboard
            rider={currentRider}
            services={services}
            onAcceptService={acceptServiceFromCloud}
            onStartService={startService}
            onCompleteService={completeService}
            onToggleTracking={toggleTracking}
          />
        )
      )}
    </Layout>
  );
};

export default App;
