export type SquareOAuthUrlResponse = {
  auth_url: string
  state?: string
}

export type SquareConnection = {
  id: number
  merchant_id: string
  merchant_name?: string
  environment?: string
  is_active?: boolean
  connection_status?: "connected" | "disconnected" | "deleted" | string
  auto_sync_enabled?: boolean
  connected_at?: string
  disconnected_at?: string | null
  created_at?: string
  updated_at?: string

  // Optional fields for future sync feature
  last_synced_at?: string | null
  next_sync_at?: string | null
}

export type SquareMerchant = {
  id?: string
  merchant_id?: string
  merchant_name?: string
  business_name?: string
  name?: string
  country?: string
  language_code?: string
  currency?: string
  status?: string
  main_location_id?: string
}

export type SquareLocation = {
  id?: number | string
  merchant_id?: string
  location_id?: string
  name?: string
  business_name?: string
  country?: string
  currency?: string
  timezone?: string
  status?: string
  is_main_location?: boolean
  created_at?: string
  updated_at?: string
}

export type SquareMoney = {
  amount?: number
  currency?: string
}

export type SquarePayment = {
  id: string | number

  merchant_id?: string
  location_id?: string

  payment_id?: string
  order_id?: string

  status?: string
  source_type?: string

  amount?: number | string | null
  currency?: string | null

  created_at_square?: string | null
  updated_at_square?: string | null

  created_at?: string | null
  updated_at?: string | null

  receipt_number?: string
  receipt_url?: string

  raw_square_response?: unknown
}

export type SquareOrderLineItem = {
  uid?: string
  name?: string
  quantity?: string
  item_type?: string
  note?: string
  base_price_money?: SquareMoney
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
}

export type SquareOrder = {
  id: string
  location_id?: string
  state?: string
  created_at?: string
  updated_at?: string
  closed_at?: string
  line_items?: SquareOrderLineItem[]
  total_money?: SquareMoney
  total_tax_money?: SquareMoney
  net_amount_due_money?: SquareMoney
  raw_square_response?: unknown
}