import { supabase } from '../services/api';

export const useMemory = () => {
  const storeMemory = async (key, value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('memories')
        .upsert({ 
          key, 
          value,
          user_id: user.id
        })
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  };

  const retrieveMemory = async (key) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('memories')
        .select()
        .eq('key', key)
        .eq('user_id', user.id)    
        .maybeSingle(); //returns single obj/null
      
      if (error) {
        console.error('Retrieval error:', error);
        return null;
      }
      return data?.value || null;
    } catch (error) {
      console.error('Retrieval error:', error);
      return null;
    }
  };

  return { storeMemory, retrieveMemory };
};