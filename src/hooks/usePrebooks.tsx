import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PrebookNote {
  id: string;
  user_id: string;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface UsePrebooksReturn {
  notes: PrebookNote[];
  loading: boolean;
  addNote: (date: string, note: string) => Promise<void>;
  updateNote: (id: string, note: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const usePrebooks = (): UsePrebooksReturn => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<PrebookNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prebook_notes')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setNotes(data as PrebookNote[]);
    } catch (error) {
      console.error('Error fetching prebook notes:', error);
      toast.error('Failed to load prebook notes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (date: string, note: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('prebook_notes')
        .insert({ user_id: user.id, date, note })
        .select()
        .single();
      
      if (error) throw error;
      setNotes(prev => [...prev, data as PrebookNote]);
      toast.success('Note added');
    } catch (error: any) {
      console.error('Error adding note:', error);
      if (error.code === '23505') {
        // Unique constraint - update instead
        const existing = notes.find(n => n.date === date);
        if (existing) {
          await updateNote(existing.id, note);
          return;
        }
      }
      toast.error('Failed to add note');
    }
  };

  const updateNote = async (id: string, note: string) => {
    try {
      const { error } = await supabase
        .from('prebook_notes')
        .update({ note })
        .eq('id', id);
      
      if (error) throw error;
      setNotes(prev => prev.map(n => n.id === id ? { ...n, note } : n));
      toast.success('Note updated');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prebook_notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
  };
};