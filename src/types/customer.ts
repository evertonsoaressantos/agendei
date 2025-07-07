export interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
  user_id: string;
}

export interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  status: 'active' | 'inactive';
}

export interface CustomerFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  country: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface CustomerAuditLog {
  audit_id: number;
  customer_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  changed_by: string;
  changed_at: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}