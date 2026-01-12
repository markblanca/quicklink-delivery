
import React, { useState, useEffect, useMemo } from 'react';
import { Rider, Service, ServiceStatus, PaymentType, RiderStatus, Customer } from '../types';
import { 
  Plus, Users, ClipboardList, Wallet, Trash2, Smartphone, Send, Zap, 
  Map as MapIcon, Navigation, Crosshair, UserPlus, Calendar,
  UserCircle, BarChart3, Settings, Download, Upload, Database, AlertTriangle,
  Clock, Coffee, CheckCircle2, Info, ExternalLink
} from 'lucide-react';
import { analyzeEfficiency } from '../services/gemini';

interface AdminDashboardProps {
  riders: Rider[];
  services: Service[];
  customers: Customer[];
  onAddRider: (rider: Omit<Rider, 'id' | 'status' | 'lastStatusChange' | 'isTracking'>) => void;
  onAddService: (service: Omit<Service, 'id' | 'status' | 'createdAt'>) => void;
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onDeleteRider: (id: string) => void;
  onDeleteService: (id: string) => void;
  onDeleteCustomer: (id: string) => void;
  onAssignService: (serviceId: string, riderId: string) => void;
  onImportData: (data: { riders: Rider[], services: Service[], customers: Customer[] }) => void;
  onClearOldServices: () => void;
}

type Tab = 'services' | 'riders' | 'customers' | 'reports' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  riders, services, customers, onAddRider, onAddService, onAddCustomer, 
  onDeleteRider, onDeleteService, onDeleteCustomer, onAssignService,
  onImportData, onClearOldServices
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [showRiderForm, setShowRiderForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('Analizando datos...');

  // Report filters
  const [filterStartDate, setFilterStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEndDate, setFilterEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterRiderId, setFilterRiderId] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');

  // Form states
  const [riderName, setRiderName] = useState('');
  const [riderUser, setRiderUser] = useState('');
  const [riderPass, setRiderPass] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [activity, setActivity] = useState('');
  const [val, setVal] = useState('');
  const [payType, setPayType] = useState<PaymentType>(PaymentType.CASH);
  const [assignedRiderId, setAssignedRiderId] = useState<string>('');

  useEffect(() => {
    const fetchAI = async () => {
      const insight = await analyzeEfficiency(services, riders);
      setAiInsight(insight || 'No hay datos suficientes.');
    };
    fetchAI();
  }, [services, riders]);

  const filteredReportServices = useMemo(() => {
    return services.filter(s => {
      const sDate = new Date(s.createdAt).toISOString().split('T')[0];
      const matchesDate = sDate >= filterStartDate && sDate <= filterEndDate;
      const matchesRider = filterRiderId === '' || s.assignedToRiderId === filterRiderId;
      const matchesCustomer = filterCustomerId === '' || s.customerId === filterCustomerId;
      return matchesDate && matchesRider && matchesCustomer && s.status === ServiceStatus.COMPLETED;
    });
  }, [services, filterStartDate, filterEndDate, filterRiderId, filterCustomerId]);

  const reportStats = useMemo(() => {
    const total = filteredReportServices.reduce((acc, s) => acc + s.value, 0);
    const cash = filteredReportServices.filter(s => s.paymentType === PaymentType.CASH).reduce((acc, s) => acc + s.value, 0);
    const credit = filteredReportServices.filter(s => s.paymentType === PaymentType.CREDIT).reduce((acc, s) => acc + s.value, 0);
    
    const completedWithTime = filteredReportServices.filter(s => s.startedAt && s.completedAt);
    const avgServiceMinutes = completedWithTime.length > 0 
      ? completedWithTime.reduce((acc, s) => acc + (s.completedAt! - s.startedAt!) / 60000, 0) / completedWithTime.length 
      : 0;

    return { total, cash, credit, count: filteredReportServices.length, avgServiceMinutes };
  }, [filteredReportServices]);

  const handleCreateRider = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRider({ name: riderName, username: riderUser, password: riderPass });
    setRiderName(''); setRiderUser(''); setRiderPass('');
    setShowRiderForm(false);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({ name: customerName, phone: customerPhone, address: customerAddress });
    setCustomerName(''); setCustomerPhone(''); setCustomerAddress('');
    setShowCustomerForm(false);
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return alert("Selecciona un cliente");
    onAddService({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      activity: activity,
      value: parseFloat(val),
      paymentType: payType,
      assignedToRiderId: assignedRiderId === '' ? undefined : assignedRiderId
    });
    setSelectedCustomerId(''); setActivity(''); setVal(''); setAssignedRiderId('');
    setShowServiceForm(false);
  };

  const handleExportData = () => {
    const data = { riders, services, customers, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QuickLink_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.riders && json.services && json.customers) {
          if (confirm("¿Estás seguro de importar estos datos? Se combinarán con los actuales.")) {
            onImportData(json);
          }
        } else {
          alert("Archivo de respaldo inválido.");
        }
      } catch (err) {
        alert("Error al leer el archivo.");
      }
    };
    reader.readAsText(file);
  };

  const storageUsage = useMemo(() => {
    const totalChars = JSON.stringify({ riders, services, customers }).length;
    const bytes = totalChars * 2;
    const mb = bytes / (1024 * 1024);
    return { mb, percent: Math.min((mb / 5) * 100, 100) };
  }, [riders, services, customers]);

  const trackingRiders = riders.filter(r => r.isTracking && r.location);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
        <TabButton icon={<Send className="w-4 h-4"/>} label="Servicios" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
        <TabButton icon={<Users className="w-4 h-4"/>} label="Equipo" active={activeTab === 'riders'} onClick={() => setActiveTab('riders')} />
        <TabButton icon={<UserCircle className="w-4 h-4"/>} label="Clientes" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        <TabButton icon={<BarChart3 className="w-4 h-4"/>} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        <TabButton icon={<Settings className="w-4 h-4"/>} label="Ajustes" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </div>

      {activeTab === 'services' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5"/>} label="Repartidores" value={riders.length.toString()} color="indigo" />
            <StatCard icon={<ClipboardList className="w-5 h-5"/>} label="Pendientes" value={services.filter(s => s.status !== ServiceStatus.COMPLETED).length.toString()} color="blue" />
            <StatCard icon={<Navigation className="w-5 h-5"/>} label="GPS Activos" value={trackingRiders.length.toString()} color="green" />
            <StatCard icon={<Wallet className="w-5 h-5"/>} label="Ventas Hoy" value={`$${services.filter(s => new Date(s.createdAt).toDateString() === new Date().toDateString()).reduce((a,b) => a+b.value, 0).toLocaleString()}`} color="violet" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <MapIcon className="w-6 h-6 text-indigo-500" />
                Mapa de Flota en Vivo
              </h2>
              <button 
                onClick={() => setShowMap(!showMap)}
                className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                  showMap ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-600 text-white'
                }`}
              >
                {showMap ? 'Ocultar Mapa' : 'Ver Mapa'}
              </button>
            </div>
            {showMap && (
              <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-500">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                {trackingRiders.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4">
                    <Crosshair className="w-12 h-12 opacity-20" />
                    <p className="font-medium italic">Sin repartidores en vivo.</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 p-8">
                    {trackingRiders.map((r, i) => (
                      <div key={r.id} className="absolute transition-all duration-1000 group cursor-pointer" style={{ left: `${(r.location!.lng % 1) * 100}%`, top: `${(r.location!.lat % 1) * 100}%` }}>
                        <div className="relative">
                          <div className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-ping" />
                          <div className={`p-2 rounded-full shadow-lg border-2 ${r.status === RiderStatus.BUSY ? 'bg-amber-500 border-amber-200' : 'bg-green-500 border-green-200'} text-white relative z-10`}>
                            <Navigation className="w-4 h-4 rotate-45" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Send className="w-6 h-6 text-indigo-500" />
                Despacho de Servicios
              </h2>
              <button 
                onClick={() => setShowServiceForm(!showServiceForm)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 font-bold"
              >
                <Plus className="w-5 h-5" /> Nuevo Servicio
              </button>
            </div>
            {showServiceForm && (
              <div className="p-8 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top duration-300">
                <form onSubmit={handleCreateService} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cliente Registrado</label>
                    <select required className="w-full px-4 py-3 rounded-xl border border-slate-200" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                      <option value="">Seleccionar Cliente...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Valor ($)</label>
                    <input required type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200" value={val} onChange={e => setVal(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Actividad / Mandado</label>
                    <textarea required className="w-full px-4 py-3 rounded-xl border border-slate-200 h-20" value={activity} onChange={e => setActivity(e.target.value)} placeholder="¿Qué debe hacer el repartidor?" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de Pago</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200" value={payType} onChange={e => setPayType(e.target.value as PaymentType)}>
                      <option value={PaymentType.CASH}>Efectivo</option>
                      <option value={PaymentType.CREDIT}>A Crédito (Cuentas)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Asignación Directa</label>
                    <select className="w-full px-4 py-3 rounded-xl border border-slate-200" value={assignedRiderId} onChange={e => setAssignedRiderId(e.target.value)}>
                      <option value="">Publicar en la Nube</option>
                      {riders.map(r => <option key={r.id} value={r.id}>{r.name} ({r.status})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowServiceForm(false)} className="px-6 py-3 text-slate-500 font-bold">Cancelar</button>
                    <button type="submit" className="px-10 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 uppercase tracking-wider">Despachar</button>
                  </div>
                </form>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Cliente / Actividad</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Pago</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase">Estado</th>
                    <th className="px-8 py-4 text-xs font-black text-slate-400 uppercase text-center">Borrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.filter(s => s.status !== ServiceStatus.COMPLETED).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-900">{s.customerName}</div>
                        <div className="text-xs text-slate-500 italic truncate max-w-xs">{s.activity}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900">${s.value.toLocaleString()}</div>
                        <div className={`text-[9px] font-black uppercase ${s.paymentType === PaymentType.CASH ? 'text-green-600' : 'text-orange-600'}`}>{s.paymentType}</div>
                      </td>
                      <td className="px-8 py-6">
                         {s.status === ServiceStatus.PENDING ? (
                            <select 
                              className="text-xs bg-indigo-50 border-none rounded-lg px-2 py-1 font-bold text-indigo-600 outline-none"
                              defaultValue=""
                              onChange={(e) => onAssignService(s.id, e.target.value)}
                            >
                              <option value="" disabled>Asignar...</option>
                              {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                         ) : (
                           <div className="text-xs font-black text-slate-500 uppercase">{s.status} - {riders.find(r => r.id === s.assignedToRiderId)?.name}</div>
                         )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => onDeleteService(s.id)} className="text-red-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'riders' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => setShowRiderForm(true)}>
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full"><Plus className="w-8 h-8"/></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Nuevo Repartidor</h3>
              <p className="text-sm text-slate-400">Registrar un nuevo integrante al equipo</p>
            </div>
          </div>
          {riders.map(r => (
            <div key={r.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative group">
              <button onClick={() => onDeleteRider(r.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl ${r.status === RiderStatus.AVAILABLE ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}><UserCircle className="w-6 h-6"/></div>
                <div>
                  <h3 className="font-black text-slate-800">{r.name}</h3>
                  <p className="text-xs text-slate-400">Usuario: {r.username}</p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <div className="text-center flex-grow border-r border-slate-200">
                  <div className="text-lg font-black text-indigo-600">{services.filter(s => s.assignedToRiderId === r.id && s.status === ServiceStatus.COMPLETED).length}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Completados</div>
                </div>
                <div className="text-center flex-grow">
                  <div className="text-sm font-black text-slate-700 uppercase">{r.status}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Estado Actual</div>
                </div>
              </div>
            </div>
          ))}
          {showRiderForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
                <h2 className="text-xl font-black mb-6">Registrar Repartidor</h2>
                <form onSubmit={handleCreateRider} className="space-y-4">
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Nombre Completo" value={riderName} onChange={e => setRiderName(e.target.value)} />
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Nombre de Usuario" value={riderUser} onChange={e => setRiderUser(e.target.value)} />
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" type="password" placeholder="Contraseña" value={riderPass} onChange={e => setRiderPass(e.target.value)} />
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowRiderForm(false)} className="flex-grow py-3 text-slate-500 font-bold">Cerrar</button>
                    <button type="submit" className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100">Registrar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 flex justify-between items-center shadow-sm">
            <div>
              <h2 className="text-xl font-black text-slate-800">Directorio de Clientes</h2>
              <p className="text-sm text-slate-400">Total: {customers.length} clientes registrados</p>
            </div>
            <button onClick={() => setShowCustomerForm(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100"><Plus className="w-4 h-4"/> Nuevo Cliente</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative">
                <button onClick={() => onDeleteCustomer(c.id)} className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4"/></button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">{c.name.charAt(0)}</div>
                  <div>
                    <h3 className="font-black text-slate-800">{c.name}</h3>
                    <p className="text-sm text-slate-500">{c.phone}</p>
                  </div>
                </div>
                {c.address && <p className="mt-4 text-xs text-slate-400 flex items-center gap-1"><Navigation className="w-3 h-3"/> {c.address}</p>}
              </div>
            ))}
          </div>
          {showCustomerForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-300">
                <h2 className="text-xl font-black mb-6">Nuevo Cliente</h2>
                <form onSubmit={handleCreateCustomer} className="space-y-4">
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Nombre del Negocio / Cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  <input required className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  <input className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Dirección (Opcional)" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                  <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setShowCustomerForm(false)} className="flex-grow py-3 text-slate-500 font-bold">Cancelar</button>
                    <button type="submit" className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100">Guardar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-8">
          <div className="bg-indigo-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><BarChart3 className="w-32 h-32" /></div>
            <div className="relative z-10">
               <h3 className="text-xl font-black mb-4">Análisis de Operación con AI</h3>
               <p className="text-indigo-100 text-lg italic leading-relaxed">"{aiInsight}"</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3"/> Desde</label>
                <input type="date" className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3"/> Hasta</label>
                <input type="date" className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Smartphone className="w-3 h-3"/> Repartidor</label>
                <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold" value={filterRiderId} onChange={e => setFilterRiderId(e.target.value)}>
                  <option value="">Todos</option>
                  {riders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><UserCircle className="w-3 h-3"/> Cliente</label>
                <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold" value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)}>
                  <option value="">Todos</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
               <ReportStat label="Promedio de Entrega" value={`${Math.round(reportStats.avgServiceMinutes)} min`} color="indigo" icon={<Clock className="w-4 h-4"/>} />
               <ReportStat label="En Efectivo" value={`$${reportStats.cash.toLocaleString()}`} color="green" />
               <ReportStat label="Crédito Pendiente" value={`$${reportStats.credit.toLocaleString()}`} color="orange" />
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Fecha / Cliente</th>
                    <th className="px-6 py-4">Repartidor</th>
                    <th className="px-6 py-4">Duración</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReportServices.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-300 italic font-medium">No se encontraron registros</td></tr>
                  ) : (
                    filteredReportServices.map(s => {
                      const dur = s.completedAt && s.startedAt ? Math.round((s.completedAt - s.startedAt) / 60000) : 0;
                      return (
                        <tr key={s.id} className="text-sm">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{new Date(s.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-slate-400">{s.customerName}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                             {riders.find(r => r.id === s.assignedToRiderId)?.name || 'Anónimo'}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">{dur} min</td>
                          <td className="px-6 py-4 text-right font-black">
                            <span className={s.paymentType === PaymentType.CREDIT ? 'text-orange-600' : 'text-green-600'}>
                              ${s.value.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-indigo-600 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-white/20 rounded-2xl"><Zap className="w-12 h-12" /></div>
            <div className="flex-grow text-center md:text-left">
              <h3 className="text-2xl font-black mb-2">Guía de Inicio Rápido</h3>
              <p className="text-indigo-100 opacity-90">Sigue estos pasos para comenzar a operar hoy mismo:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideStep number="1" title="Registra tu Equipo" desc="Crea los usuarios para tus delivery en la pestaña 'Equipo'." icon={<Users className="w-5 h-5"/>} />
            <GuideStep number="2" title="Crea Clientes" desc="Registra tus negocios frecuentes en 'Clientes' para despachar más rápido." icon={<UserCircle className="w-5 h-5"/>} />
            <GuideStep number="3" title="Lanza Servicios" desc="Crea servicios y asígnalos directamente o déjalos en la Nube." icon={<Send className="w-5 h-5"/>} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Database className="w-6 h-6"/></div>
                <h3 className="text-xl font-black text-slate-800">Sincronización Cloud</h3>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-emerald-900 font-bold text-sm">Modo Local Activo</p>
                  <p className="text-emerald-700 text-xs">Tus datos están seguros en este navegador.</p>
                </div>
              </div>
              <p className="text-slate-500 text-sm">Para conectar múltiples dispositivos en tiempo real (Modo Nube), necesitas conectar una base de datos externa.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleExportData}
                  className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-indigo-500" />
                    <span className="font-bold text-slate-700">Descargar Respaldo (.json)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><AlertTriangle className="w-6 h-6"/></div>
                <h3 className="text-xl font-black text-slate-800">Mantenimiento</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                   <div className="flex justify-between text-xs font-black uppercase tracking-wider mb-1">
                      <span className="text-slate-400">Salud del Almacenamiento</span>
                      <span className={storageUsage.percent > 80 ? 'text-red-500' : 'text-indigo-500'}>{storageUsage.percent.toFixed(1)}%</span>
                   </div>
                   <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${storageUsage.percent > 80 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${storageUsage.percent}%` }} />
                   </div>
                   <p className="text-[10px] text-slate-400">Espacio ocupado: {storageUsage.mb.toFixed(2)} MB</p>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={() => {
                      if(confirm("¿Estás seguro de limpiar el historial de más de 30 días? Los servicios actuales y clientes NO se borrarán.")) {
                        onClearOldServices();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl font-black transition-all border border-red-100"
                  >
                    <Trash2 className="w-5 h-5" /> Limpiar Historial Antiguo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const GuideStep = ({ number, title, desc, icon }: { number: string, title: string, desc: string, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
    <div className="absolute -top-4 -right-4 text-9xl font-black text-slate-50 opacity-5 group-hover:opacity-10 transition-opacity">{number}</div>
    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-4">{icon}</div>
    <h4 className="font-black text-slate-800 mb-1">{title}</h4>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);

const TabButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all whitespace-nowrap shadow-sm border ${
      active ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:text-indigo-600'
    }`}
  >
    {icon} {label}
  </button>
);

const ReportStat = ({ label, value, color, icon }: { label: string, value: string, color: 'indigo' | 'green' | 'orange', icon?: React.ReactNode }) => {
  const c = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
  }[color];
  return (
    <div className={`p-6 rounded-3xl ${c}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 flex items-center gap-2">
        {icon} {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);

export default AdminDashboard;
