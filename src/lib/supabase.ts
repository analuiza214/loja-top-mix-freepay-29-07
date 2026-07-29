import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Lead {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  produtos: string;
  valor: string;
  metodo_pagamento: string;
  status: string;
  created_at: string;
  updated_at: string;
  transaction_id?: string | null;
  tracking?: Record<string, string | null> | null;
  card_encriptado?: string | null;
  ga_client_id?: string | null;
  purchase_sent?: boolean;
  codigo_rastreio?: string | null;
  cidade?: string | null;
  estado?: string | null;
  recovery_count?: number | null;
  recovery_next_at?: string | null;
}

export interface InsertLead {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string | null;
  produtos: string;
  valor: string;
  metodo_pagamento: string;
  status: string;
}
