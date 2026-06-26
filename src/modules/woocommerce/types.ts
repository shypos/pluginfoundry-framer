export interface WCProduct {
  id: string;
  name: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number;
  status: 'publish' | 'draft';
  categories: string;
  description: string;
}

export interface WCOrder {
  id: string;
  customer: {
    name: string;
    email: string;
    city: string;
  };
  total: string;
  status: 'processing' | 'completed' | 'pending' | 'cancelled';
  created_at: string;
  line_items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
}

export interface SyncLog {
  id: string;
  storeId: string;
  storeName: string;
  eventType: string;
  status: 'success' | 'failed';
  timestamp: string;
  details: string;
  errorLog?: string;
}

export interface Field {
  id: string;
  label: string;
  desc: string;
}

export interface FieldCategory {
  id: string;
  name: string;
  fields: Field[];
}
