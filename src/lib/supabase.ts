import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabaseConfigured = !!url && !!key;

// The session (who is signed in) is kept in AsyncStorage so users stay signed in between launches.
// On the web, detectSessionInUrl completes the sign-in when someone opens the confirmation link from their email.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web' }
});
