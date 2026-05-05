import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ejjobdbywnolopistcvs.supabase.co';
const supabaseAnonKey = 'sb_publishable_6EJFrm2cdMPFImgT5dl0HQ_D2zvw74J';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
