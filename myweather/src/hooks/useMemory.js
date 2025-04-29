import { supabase } from '../services/api';

export const useMemory = () => {
  const storeMemory = async (key, value) => {
    const { data, error } = await supabase
      .from('memories')
      .upsert({ 
        key, 
        value: JSON.stringify(value),
        user_id: (await supabase.auth.getUser()).data.user?.id // Add user association
      })
      .select();
    
    if (error) {
      console.error('Storage error:', error);
      throw error;
    }
    return data;
  };

  const retrieveMemory = async (key) => {
    const { data, error } = await supabase
      .from('memories')
      .select('value')
      .eq('key', key)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // Filter by user
      .single();
    
    if (error) {
      console.error('Retrieval error:', error);
      return null;
    }
    return data?.value ? JSON.parse(data.value) : null;
  };

  return { storeMemory, retrieveMemory };
};