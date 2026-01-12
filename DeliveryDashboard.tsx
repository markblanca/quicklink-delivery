
import React, { useState, useEffect } from 'react';
import { Rider, Service, ServiceStatus, RiderStatus } from '../types';
import { Package, MapPin, Phone, DollarSign, PlayCircle, History, Timer, Map as MapIcon, ShieldCheck, ShieldOff, Coffee, Clock } from 'lucide-react';

interface DeliveryDashboardProps {
  rider: Rider;
  services: Service[];
  onAcceptService: (serviceId: string) => void;
  onStartService: (serviceId: string) => void;
  onCompleteService: (serviceId: string) => void;
  onToggleTracking: (enabled: boolean) => void;
}

const DeliveryDashboard: React.FC<DeliveryDashboardProps> = ({ 
  rider, services, onAcceptService, onStartService, onCompleteService, onToggleTracking 
}) => {
  const [vacantSeconds, setVacantSeconds] = useState(0);

  const availableInCloud = services.filter(s => s.status === ServiceStatus.PENDING);
  const myPending = services.filter(s => s.assignedToRiderId === rider.id && s.status === ServiceStatus.ASSIGNED);
  const myInProgress = services.filter(s => s.assignedToRiderId === rider.id && s.status === ServiceStatus.IN_PROGRESS);
  const myCompleted = services.filter(s => s.assignedToRiderId === rider.id && s.status === ServiceStatus.COMPLETED);

  const earningsToday = myCompleted.reduce((acc, s) => acc + s.value, 0);

  // Vacant time logic
  useEffect(() => {
    let interval: number;
    if (rider.status === RiderStatus.AVAILABLE && rider.lastStatusChange) {
      interval = window.setInterval(() => {
        setVacantSeconds(Math.floor((Date.now() - rider.lastStatusChange) / 1000));
      }, 1000);
    } else {
      setVacantSeconds(0);
    }
    return () => clearInterval(interval);
  }, [rider.status, rider.lastStatusChange]);

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Tracking Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
        rider.isTracking ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${rider.isTracking ? 'bg-white/20' : 'bg-slate-100'}`}>
            {rider.isTracking ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-bold text-sm">Rastreo GPS {rider.isTracking ? 'Activado' : 'Desactivado'}</p>
            <p className="text-[10px] opacity-80">{rider.isTracking ? 'El administrador puede ver tu ubicación en tiempo real.' : 'Tu ubicación es privada.'}</p>
          </div>
        </div>
        <button
          onClick={() => onToggleTracking(!rider.isTracking)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            rider.isTracking ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
          }`}
        >
          {rider.isTracking ? 'Detener' : 'Compartir'}
        </button>
      </div>

      {/* Rider Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center flex flex-col items-center">
          <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
             <Coffee className="w-3 h-3"/> Espera
          </div>
          <div className={`text-sm font-black font-mono ${rider.status === RiderStatus.AVAILABLE ? 'text-amber-600' : 'text-slate-300'}`}>
            {rider.status === RiderStatus.AVAILABLE ? formatTime(vacantSeconds) : '--:--'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-400 uppercase mb-1">En Servicio</div>
          <div className="text-xl font-black text-indigo-600">{myInProgress.length}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-400 uppercase mb-1">Hoy</div>
          <div className="text-xl font-black text-slate-900">${earningsToday.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <div className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> Estado</div>
          <div className={`text-[10px] font-black uppercase ${rider.status === RiderStatus.AVAILABLE ? 'text-green-600' : 'text-amber-600'}`}>
            {rider.status}
          </div>
        </div>
      </div>

      {/* Cloud Pool */}
      {availableInCloud.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-500" />
            Servicios en la Nube
            <span className="ml-auto bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full animate-pulse">
              {availableInCloud.length} Disponibles
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableInCloud.map(s => (
              <ServiceCard key={s.id} service={s} actionLabel="Aceptar" onAction={() => onAcceptService(s.id)} color="amber" />
            ))}
          </div>
        </section>
      )}

      {/* Active Jobs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-indigo-500" />
          Mis Servicios Activos
        </h2>
        
        {myInProgress.length === 0 && myPending.length === 0 && availableInCloud.length === 0 && (
          <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl py-12 text-center text-slate-400">
            No tienes servicios asignados. ¡Echa un vistazo a la nube!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myInProgress.map(s => (
            <ServiceCard key={s.id} service={s} actionLabel="Finalizar" onAction={() => onCompleteService(s.id)} color="green" showTimer />
          ))}
          {myPending.map(s => (
            <ServiceCard key={s.id} service={s} actionLabel="Iniciar" onAction={() => onStartService(s.id)} color="indigo" />
          ))}
        </div>
      </section>

      {/* History */}
      {myCompleted.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-slate-500" />
            Historial de Hoy
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-center">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myCompleted.map(s => {
                    const duration = s.completedAt && s.startedAt ? Math.round((s.completedAt - s.startedAt) / 60000) : 0;
                    return (
                      <tr key={s.id}>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{s.customerName}</div>
                          <div className="text-xs text-slate-400">{new Date(s.completedAt!).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">
                          ${s.value.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-500">
                          {duration} min
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

interface ServiceCardProps {
  service: Service;
  actionLabel: string;
  onAction: () => void;
  color: 'amber' | 'indigo' | 'green';
  showTimer?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, actionLabel, onAction, color, showTimer = false }) => {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (showTimer && service.startedAt) {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - service.startedAt!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showTimer, service.startedAt]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const bgStyles = {
    amber: "border-amber-200 bg-amber-50/30",
    indigo: "border-indigo-200 bg-indigo-50/30",
    green: "border-green-200 bg-green-50/30",
  };

  const btnStyles = {
    amber: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
    indigo: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
    green: "bg-green-600 hover:bg-green-700 shadow-green-100",
  };

  return (
    <div className={`p-6 rounded-2xl border-2 ${bgStyles[color]} shadow-sm flex flex-col`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Package className="w-5 h-5 text-slate-600" />
        </div>
        {showTimer && (
          <div className="px-3 py-1 bg-white border border-green-200 rounded-full flex items-center gap-1.5 shadow-sm">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-black font-mono text-slate-800">{formatSeconds(elapsed)}</span>
          </div>
        )}
      </div>

      <div className="space-y-3 flex-grow">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-md border border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <span className="text-lg font-bold text-slate-900">{service.customerName}</span>
        </div>

        <div className="text-sm text-slate-600 leading-relaxed bg-white/50 p-3 rounded-lg italic">
          "{service.activity}"
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100 text-xs font-semibold text-slate-700">
            <Phone className="w-3 h-3" /> {service.customerPhone}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100 text-xs font-bold text-slate-900">
            <DollarSign className="w-3 h-3 text-green-500" /> ${service.value.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100 text-xs font-bold text-blue-600 uppercase">
             {service.paymentType}
          </div>
        </div>
      </div>

      <button
        onClick={onAction}
        className={`mt-6 w-full py-3 ${btnStyles[color]} text-white rounded-xl font-black uppercase tracking-wider transition-all shadow-lg active:scale-95`}
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default DeliveryDashboard;
