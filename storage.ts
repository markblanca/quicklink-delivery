
import { Rider, Service, RiderStatus, Customer } from '../types';

const STORAGE_KEYS = {
  RIDERS: 'quicklink_riders',
  SERVICES: 'quicklink_services',
  CUSTOMERS: 'quicklink_customers',
};

// Simulación de delay de red para preparar al usuario para una base de datos real
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getStoredRiders = async (): Promise<Rider[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.RIDERS);
  if (!data) return [
    { id: 'r1', username: 'pedro', password: '123', name: 'Pedro Gomez', status: RiderStatus.AVAILABLE, lastStatusChange: Date.now(), isTracking: false },
    { id: 'r2', username: 'juan', password: '123', name: 'Juan Lopez', status: RiderStatus.AVAILABLE, lastStatusChange: Date.now(), isTracking: false },
  ];
  return JSON.parse(data);
};

export const saveRiders = async (riders: Rider[]) => {
  localStorage.setItem(STORAGE_KEYS.RIDERS, JSON.stringify(riders));
};

export const getStoredServices = async (): Promise<Service[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
  return data ? JSON.parse(data) : [];
};

export const saveServices = async (services: Service[]) => {
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
};

export const getStoredCustomers = async (): Promise<Customer[]> => {
  await delay(300);
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!data) return [
    { id: 'c1', name: 'Farmacia Central', phone: '3001234567', address: 'Calle 10 #5-20' },
    { id: 'c2', name: 'Restaurante El Sabor', phone: '3119876543', address: 'Av Principal #2' },
  ];
  return JSON.parse(data);
};

export const saveCustomers = async (customers: Customer[]) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};
