import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for fallback when Supabase is not available
const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Usuário Demo',
  email: 'admin@exemplo.com',
  businessName: 'Clínica Estética Demo',
  phone: '+55 11 99999-9999',
  address: 'Rua das Flores, 123 - São Paulo, SP'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseAvailable, setSupabaseAvailable] = useState(true);

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'https://your-project.supabase.co' || 
        supabaseKey === 'your-anon-key') {
      console.log('Supabase not configured, using demo mode');
      setSupabaseAvailable(false);
      setLoading(false);
      return;
    }

    // Try to get initial session with reduced timeout and better error handling
    const initAuth = async () => {
      try {
        // First, try a quick health check with a shorter timeout
        const healthCheck = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 3000); // 3 second timeout for health check
          
          supabase.auth.getSession()
            .then(() => {
              clearTimeout(timeout);
              resolve(true);
            })
            .catch(() => {
              clearTimeout(timeout);
              resolve(false);
            });
        });

        const isHealthy = await healthCheck;
        
        if (!isHealthy) {
          console.log('Supabase health check failed, using demo mode');
          setSupabaseAvailable(false);
          setLoading(false);
          return;
        }

        // If health check passes, get the actual session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          setSupabaseAvailable(false);
          setLoading(false);
          return;
        }

        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Supabase connection failed, using demo mode:', error);
        setSupabaseAvailable(false);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes only if Supabase is available
    let subscription: any = null;
    
    const setupAuthListener = async () => {
      // Wait a bit to ensure Supabase availability is determined
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (supabaseAvailable) {
        try {
          const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
              if (session?.user) {
                await loadUserProfile(session.user);
              } else {
                setUser(null);
                setLoading(false);
              }
            } catch (error) {
              console.error('Auth state change error:', error);
              setSupabaseAvailable(false);
              setLoading(false);
            }
          });
          
          subscription = authSubscription;
        } catch (error) {
          console.error('Failed to set up auth listener:', error);
          setSupabaseAvailable(false);
        }
      }
    };

    setupAuthListener();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        // If user doesn't exist in our users table, create them
        if (error.code === 'PGRST116') {
          console.log('User profile not found, creating new profile for user:', authUser.id);
          
          const newUser = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
            business_name: 'Meu Negócio',
            phone: authUser.user_metadata?.phone || '',
            address: null
          };

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();

          if (createError) {
            // If we get a duplicate key error, it means the profile was created by another process
            // (e.g., database trigger or race condition), so let's try to fetch it
            if (createError.code === '23505') {
              console.log('Profile already exists, fetching existing profile');
              
              const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

              if (fetchError) {
                throw fetchError;
              }

              setUser({
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                businessName: existingUser.business_name,
                phone: existingUser.phone,
                address: existingUser.address
              });
            } else {
              throw createError;
            }
          } else {
            setUser({
              id: createdUser.id,
              name: createdUser.name,
              email: createdUser.email,
              businessName: createdUser.business_name,
              phone: createdUser.phone,
              address: createdUser.address
            });
          }
        } else {
          throw error;
        }
      } else {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          businessName: data.business_name,
          phone: data.phone,
          address: data.address
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Fallback to auth user data
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
        email: authUser.email || '',
        businessName: 'Meu Negócio',
        phone: authUser.user_metadata?.phone || '',
        address: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // If Supabase is not available, use demo credentials
    if (!supabaseAvailable) {
      if (email === 'admin@exemplo.com' && password === 'admin123') {
        setUser(DEMO_USER);
        localStorage.setItem('demo-auth', 'true');
        return true;
      }
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to demo mode if Supabase fails
      if (email === 'admin@exemplo.com' && password === 'admin123') {
        setSupabaseAvailable(false);
        setUser(DEMO_USER);
        localStorage.setItem('demo-auth', 'true');
        return true;
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      if (supabaseAvailable) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('demo-auth');
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;

    // If in demo mode, just update local state
    if (!supabaseAvailable) {
      setUser(prev => prev ? { ...prev, ...userData } : null);
      return;
    }

    try {
      const updateData = {
        name: userData.name,
        email: userData.email,
        business_name: userData.businessName,
        phone: userData.phone,
        address: userData.address,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        ...userData
      } : null);

      // Update auth user email if changed
      if (userData.email && userData.email !== user.email) {
        await supabase.auth.updateUser({ email: userData.email });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  // Check for demo auth on mount
  useEffect(() => {
    if (!supabaseAvailable && localStorage.getItem('demo-auth') === 'true') {
      setUser(DEMO_USER);
    }
  }, [supabaseAvailable]);

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};