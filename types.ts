
export enum UserRole {
  ADMIN = 'ADMIN',
  DELIVERY = 'DELIVERY'
}

export enum ServiceStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum PaymentType {
  CASH = 'CASH',
  CREDIT = 'CREDIT'
}

export enum RiderStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

export interface Location {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
}

export interface Rider {
  id: string;
  username: string;
  password?: string;
  name: string;
  status: RiderStatus;
  lastStatusChange: number;
  lastCompletedAt?: number; // Para calcular tiempo vacante
  isTracking: boolean;
  location?: Location;
}

export interface Service {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  activity: string;
  value: number;
  paymentType: PaymentType;
  status: ServiceStatus;
  assignedToRiderId?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface UserSession {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}
