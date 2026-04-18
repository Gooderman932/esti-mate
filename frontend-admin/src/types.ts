export interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  unit: string
  amount: number
  measurement?: string
  notes?: string
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
  address: string
}

export interface Estimate {
  id: string
  number: string
  type: 'estimate' | 'invoice'
  status: 'draft' | 'sent' | 'accepted' | 'paid'
  customer: CustomerInfo
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string
  business_name: string
  share_code: string
  created_at: string
  updated_at: string
}

export interface AdminStats {
  total_estimates: number
  total_invoices: number
  total_revenue: number
  active_subscriptions: number
  drafts: number
  sent: number
  accepted: number
  paid: number
}

export interface CreateEstimatePayload {
  type: 'estimate' | 'invoice'
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  notes?: string
  business_name?: string
  tax_rate?: number
}

export interface UpdateEstimatePayload {
  status?: string
  customer?: CustomerInfo
  line_items?: LineItem[]
  subtotal?: number
  tax_rate?: number
  tax_amount?: number
  total?: number
  notes?: string
  business_name?: string
}
