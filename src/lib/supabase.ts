import { createClient } from '@supabase/supabase-js';

// Detect Supabase environment variables from import.meta.env
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// Export flag indicating whether we are using a real backend or development database
export const isUsingRealSupabase = Boolean(supabaseUrl && supabaseAnonKey);

// --- LocalStorage Database Simulation (for Developer Experience) ---
class MockDatabase {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`pluginfoundry_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    localStorage.setItem(`pluginfoundry_${key}`, JSON.stringify(value));
  }

  // Auth Operations
  getCurrentUser() {
    return this.getStorageItem<{ id: string; email: string } | null>('user', {
      id: 'usr_dev_1001',
      email: 'studiolazin@gmail.com'
    });
  }

  setCurrentUser(user: { id: string; email: string } | null) {
    this.setStorageItem('user', user);
    // Initialize default tables for user if they don't exist
    if (user) {
      this.initDefaultTables(user.id);
    }
  }

  private initDefaultTables(userId: string) {
    // Scaffold Forms
    const formsKey = `forms_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${formsKey}`)) {
      this.setStorageItem(formsKey, [
        { id: 'frm_1', user_id: userId, name: 'Contact Us Page Form', submissions: 142, status: 'Active', created_at: '2026-05-10T14:22:00Z' },
        { id: 'frm_2', user_id: userId, name: 'SaaS Beta Waitlist', submissions: 890, status: 'Active', created_at: '2026-06-01T09:12:00Z' },
        { id: 'frm_3', user_id: userId, name: 'Product Feedback Survey', submissions: 0, status: 'Draft', created_at: '2026-06-11T16:45:00Z' }
      ]);
    }

    // Scaffold Store Connections
    const storesKey = `stores_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${storesKey}`)) {
      this.setStorageItem(storesKey, [
        { id: 'str_1', user_id: userId, name: 'Gourmet Coffee Boutique', url: 'https://gourmet-coffee.domain', status: 'Connected', last_sync: '2026-06-12T14:30:00Z', created_at: '2026-04-15T11:00:00Z' },
        { id: 'str_2', user_id: userId, name: 'Artisan Woodwork Shop', url: 'https://artisanwood.store', status: 'Syncing', last_sync: '2026-06-12T15:00:00Z', created_at: '2026-05-20T08:15:00Z' }
      ]);
    }

    // Scaffold Export Records
    const exportsKey = `exports_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${exportsKey}`)) {
      this.setStorageItem(exportsKey, [
        { id: 'exp_1', user_id: userId, filename: 'july_leads_export.csv', format: 'CSV', status: 'Success', row_count: 1032, created_at: '2026-06-10T10:00:00Z' },
        { id: 'exp_2', user_id: userId, filename: 'woocommerce_products_june.xlsx', format: 'Excel', status: 'Success', row_count: 5410, created_at: '2026-06-11T12:15:00Z' },
        { id: 'exp_3', user_id: userId, filename: 'form_submissions_raw.json', format: 'JSON', status: 'Processing', row_count: 0, created_at: '2026-06-12T14:45:00Z' }
      ]);
    }

    // Scaffold API Keys
    const apikeysKey = `apikeys_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${apikeysKey}`)) {
      this.setStorageItem(apikeysKey, [
        { id: 'key_1', user_id: userId, name: 'Production Sync API Token', value: 'pf_live_7a8d2e...93bf81', created_at: '2026-05-12T11:00:00Z' },
        { id: 'key_2', user_id: userId, name: 'Staging Automation Hook', value: 'pf_test_1f9b3c...4a2c0d', created_at: '2026-06-02T15:24:00Z' }
      ]);
    }

    // Scaffold Portcodes
    const portcodesKey = `portcodes_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${portcodesKey}`)) {
      this.setStorageItem(portcodesKey, [
        { id: 'wid_1', user_id: userId, name: 'Interactive Trustpilot Rating Badge', description: 'Elegant star badge showing review feedback countdown.', created_at: '2026-06-12T10:00:00Z' },
        { id: 'wid_2', user_id: userId, name: 'Aesthetic Newsletter Input Box', description: 'Polished inline micro-form showing email capture input.', created_at: '2026-06-13T12:15:00Z' }
      ]);
    }

    // Scaffold Billing Info
    const billingKey = `billing_${userId}`;
    if (!localStorage.getItem(`pluginfoundry_${billingKey}`)) {
      this.setStorageItem(billingKey, {
        plan: 'Professional Developer Plan',
        price: '49',
        used_forms: 3,
        limit_forms: 10,
        used_syncs: 840,
        limit_syncs: 5000,
        usage_percent: 16.8,
        history: [
          { id: 'inv_102', amount: '49.00', status: 'Paid', date: '2026-06-01' },
          { id: 'inv_101', amount: '49.00', status: 'Paid', date: '2026-05-01' },
          { id: 'inv_100', amount: '49.00', status: 'Paid', date: '2026-04-01' }
        ]
      });
    }
  }

  getTableData(userId: string, table: string): any[] {
    const key = `${table}_${userId}`;
    return this.getStorageItem<any[]>(key, []);
  }

  setTableData(userId: string, table: string, data: any[]): void {
    const key = `${table}_${userId}`;
    this.setStorageItem(key, data);
  }

  getBillingInfo(userId: string): any {
    const key = `billing_${userId}`;
    return this.getStorageItem<any>(key, {
      plan: 'Professional Developer Plan',
      price: '49',
      used_forms: 0,
      limit_forms: 10,
      used_syncs: 0,
      limit_syncs: 5000,
      usage_percent: 0,
      history: []
    });
  }

  setBillingInfo(userId: string, info: any): void {
    const key = `billing_${userId}`;
    this.setStorageItem(key, info);
  }
}

const mockDb = new MockDatabase();

// --- High-Fidelity API-Compatible Simulated Query Builder ---
class MockQueryBuilder {
  private action: 'select' | 'insert' | 'update' | 'delete' | null = null;
  private payload: any = null;
  private filters: Array<{ key: string; value: any }> = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;

  constructor(private table: string, private userId: string) {}

  select(columns?: string) {
    this.action = 'select';
    return this;
  }

  insert(row: any) {
    this.action = 'insert';
    this.payload = row;
    return this;
  }

  update(updates: any) {
    this.action = 'update';
    this.payload = updates;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(key: string, value: any) {
    this.filters.push({ key, value });
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderCol = column;
    this.orderAsc = ascending;
    return this;
  }

  // Thenable execution compatibility
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute();
      if (onfulfilled) {
        return onfulfilled(result);
      }
      return result;
    } catch (err) {
      if (onrejected) {
        return onrejected(err);
      }
      throw err;
    }
  }

  private async execute() {
    // Intercept 'stores' table requests to synchronize with our full-stack Express SaaS backend
    if (this.table === 'stores') {
      try {
        if (this.action === 'select') {
          const res = await fetch('/api/stores');
          if (res.ok) {
            const data = await res.json();
            return { data, error: null };
          }
        }
        if (this.action === 'insert') {
          const res = await fetch('/api/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.payload)
          });
          if (res.ok) {
            const created = await res.json();
            return { data: [created], error: null };
          }
        }
        if (this.action === 'update') {
          const idFilter = this.filters.find(f => f.key === 'id');
          if (idFilter) {
            const res = await fetch(`/api/stores/${idFilter.value}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.payload)
            });
            if (res.ok) {
              const updated = await res.json();
              return { data: [updated.store], error: null };
            }
          }
        }
        if (this.action === 'delete') {
          const idFilter = this.filters.find(f => f.key === 'id');
          if (idFilter) {
            const res = await fetch(`/api/stores/${idFilter.value}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              return { data: null, error: null };
            }
          }
        }
      } catch (err) {
        console.warn("[Supabase Forwarder] Express backend offline. Falling back to LocalStorage simulation.", err);
      }
    }

    // Intercept 'forms' table requests to synchronize with our full-stack Express Backend backend
    if (this.table === 'forms') {
      try {
        if (this.action === 'select') {
          const res = await fetch('/api/forms');
          if (res.ok) {
            const data = await res.json();
            return { data, error: null };
          }
        }
        if (this.action === 'insert') {
          const res = await fetch('/api/forms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.payload)
          });
          if (res.ok) {
            const created = await res.json();
            return { data: [created], error: null };
          }
        }
        if (this.action === 'update') {
          const idFilter = this.filters.find(f => f.key === 'id');
          if (idFilter) {
            const res = await fetch(`/api/forms/${idFilter.value}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(this.payload)
            });
            if (res.ok) {
              const updated = await res.json();
              return { data: [updated.form], error: null };
            }
          }
        }
        if (this.action === 'delete') {
          const idFilter = this.filters.find(f => f.key === 'id');
          if (idFilter) {
            const res = await fetch(`/api/forms/${idFilter.value}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              return { data: null, error: null };
            }
          }
        }
      } catch (err) {
        console.warn("[Supabase Forwarder] Express forms backend offline.", err);
      }
    }

    // Intercept 'portcodes' table requests to synchronize with our full-stack Express Portcode backend
    if (this.table === 'portcodes') {
      try {
        if (this.action === 'select') {
          const res = await fetch('/api/portcode/widgets');
          if (res.ok) {
            const data = await res.json();
            return { data, error: null };
          }
        }
        if (this.action === 'insert') {
          const res = await fetch('/api/portcode/widgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.payload)
          });
          if (res.ok) {
            const created = await res.json();
            return { data: [created], error: null };
          }
        }
        if (this.action === 'delete') {
          const idFilter = this.filters.find(f => f.key === 'id');
          if (idFilter) {
            const res = await fetch(`/api/portcode/widgets/${idFilter.value}`, {
              method: 'DELETE'
            });
            if (res.ok) {
              return { data: null, error: null };
            }
          }
        }
      } catch (err) {
        console.warn("[Supabase Forwarder] Express portcode backend offline.", err);
      }
    }

    const data = mockDb.getTableData(this.userId, this.table);

    if (this.action === 'select') {
      let filteredData = [...data];
      
      // Apply filters
      this.filters.forEach(filter => {
        filteredData = filteredData.filter(item => item[filter.key] === filter.value);
      });

      // Apply ordering
      if (this.orderCol) {
        filteredData.sort((a, b) => {
          const valA = a[this.orderCol!];
          const valB = b[this.orderCol!];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          
          const result = valA < valB ? -1 : 1;
          return this.orderAsc ? result : -result;
        });
      }

      return { data: filteredData, error: null };
    }

    if (this.action === 'insert') {
      const newRow = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: this.userId,
        created_at: new Date().toISOString(),
        ...this.payload
      };
      const updated = [newRow, ...data];
      mockDb.setTableData(this.userId, this.table, updated);

      // If adding a form, increment count in billing usage
      if (this.table === 'forms') {
        const billing = mockDb.getBillingInfo(this.userId);
        billing.used_forms += 1;
        billing.usage_percent = Number(((billing.used_syncs / billing.limit_syncs) * 100).toFixed(1));
        mockDb.setBillingInfo(this.userId, billing);
      }

      return { data: [newRow], error: null };
    }

    if (this.action === 'update') {
      const updated = data.map((item) => {
        const match = this.filters.every(filter => item[filter.key] === filter.value);
        if (match) {
          return { ...item, ...this.payload };
        }
        return item;
      });
      mockDb.setTableData(this.userId, this.table, updated);
      
      const updatedRows = updated.filter(item => 
        this.filters.every(filter => item[filter.key] === filter.value)
      );

      return { data: updatedRows, error: null };
    }

    if (this.action === 'delete') {
      const filtered = data.filter((item) => {
        const match = this.filters.every(filter => item[filter.key] === filter.value);
        return !match;
      });
      mockDb.setTableData(this.userId, this.table, filtered);

      // If deleting a form, decrement count in billing usage
      if (this.table === 'forms') {
        const billing = mockDb.getBillingInfo(this.userId);
        billing.used_forms = Math.max(0, billing.used_forms - 1);
        mockDb.setBillingInfo(this.userId, billing);
      }

      return { data: null, error: null };
    }

    return { data: null, error: new Error("No query action specified") };
  }
}

// --- Combined Hybrid Supabase Mock Client Export ---
const realSupabase = isUsingRealSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const supabase: any = {
  // If we are on real Supabase, forward calls directly
  ...(realSupabase || {}),

  // Developer mock client layer
  auth: {
    getSession: async () => {
      if (realSupabase) return realSupabase.auth.getSession();
      const user = mockDb.getCurrentUser();
      if (!user) return { data: { session: null }, error: null };
      return {
        data: {
          session: {
            user: { ...user, email_confirmed_at: new Date().toISOString() },
            access_token: 'mock_jwt_session_auth_token_for_ai_studio_preview'
          }
        },
        error: null
      };
    },

    signUp: async ({ email, password }: any) => {
      if (realSupabase) return realSupabase.auth.signUp({ email, password });
      
      const newUserId = `usr_${Math.random().toString(36).substr(2, 9)}`;
      const newUser = { id: newUserId, email };
      mockDb.setCurrentUser(newUser);

      return {
        data: {
          user: newUser,
          session: {
            user: newUser,
            access_token: 'mock_jwt_session_auth_token_for_ai_studio_preview'
          }
        },
        error: null
      };
    },

    signInWithPassword: async ({ email, password }: any) => {
      if (realSupabase) return realSupabase.auth.signInWithPassword({ email, password });

      const defaultUser = { id: 'usr_dev_1001', email };
      mockDb.setCurrentUser(defaultUser);

      return {
        data: {
          user: defaultUser,
          session: {
            user: defaultUser,
            access_token: 'mock_jwt_session_auth_token_for_ai_studio_preview'
          }
        },
        error: null
      };
    },

    signOut: async () => {
      if (realSupabase) return realSupabase.auth.signOut();
      mockDb.setCurrentUser(null);
      return { error: null };
    },

    onAuthStateChange: (callback: any) => {
      if (realSupabase) return realSupabase.auth.onAuthStateChange(callback);
      
      // Setup simple listener simulation
      const interval = setInterval(() => {
        const user = mockDb.getCurrentUser();
        const session = user ? { user, access_token: 'mock' } : null;
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      }, 1000);

      return {
        data: {
          subscription: {
            unsubscribe: () => clearInterval(interval)
          }
        }
      };
    }
  },

  // Dynamic table access with dynamic developer simulation
  from: (table: string) => {
    if (realSupabase) return realSupabase.from(table);
    const user = mockDb.getCurrentUser();
    const userId = user ? user.id : 'usr_dev_1001';
    return new MockQueryBuilder(table, userId);
  },

  // Developer local state reader
  getBilling: () => {
    const user = mockDb.getCurrentUser();
    const userId = user ? user.id : 'usr_dev_1001';
    return mockDb.getBillingInfo(userId);
  },

  setBilling: (info: any) => {
    const user = mockDb.getCurrentUser();
    const userId = user ? user.id : 'usr_dev_1001';
    mockDb.setBillingInfo(userId, info);
  }
};
