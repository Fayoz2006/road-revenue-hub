import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Save, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface PrebookNote {
  id: string;
  user_id: string;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

interface PrebooksCalendarProps {
  notes: PrebookNote[];
  onAddNote: (date: string, note: string) => Promise<void>;
  onUpdateNote: (id: string, note: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export const PrebooksCalendar = ({ notes, onAddNote, onUpdateNote, onDeleteNote }: PrebooksCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PrebookNote | null>(null);
  const [noteText, setNoteText] = useState('');

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = monthStart.getDay();
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Add padding days from previous month
    const paddingDays: Date[] = [];
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - (i + 1));
      paddingDays.push(date);
    }
    
    // Add padding days for next month to complete the grid
    const totalDays = paddingDays.length + allDays.length;
    const remainingDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
    const endPaddingDays: Date[] = [];
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i);
      endPaddingDays.push(date);
    }
    
    return [...paddingDays, ...allDays, ...endPaddingDays];
  }, [currentMonth]);

  const getNoteForDate = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return notes.find(n => n.date === dateStr);
  }, [notes]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const existingNote = getNoteForDate(date);
    if (existingNote) {
      setEditingNote(existingNote);
      setNoteText(existingNote.note);
    } else {
      setEditingNote(null);
      setNoteText('');
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate || !noteText.trim()) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    if (editingNote) {
      await onUpdateNote(editingNote.id, noteText);
    } else {
      await onAddNote(dateStr, noteText);
    }
    
    setIsDialogOpen(false);
    setNoteText('');
    setEditingNote(null);
  };

  const handleDelete = async () => {
    if (!editingNote) return;
    await onDeleteNote(editingNote.id);
    setIsDialogOpen(false);
    setNoteText('');
    setEditingNote(null);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Prebooks</h2>
          <p className="text-muted-foreground">Task calendar for future loads</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="glass-card overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-xl font-bold">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {weekDays.map(day => (
            <div 
              key={day} 
              className="p-2 sm:p-3 text-center text-xs sm:text-sm font-medium text-muted-foreground"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const note = getNoteForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            
            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "relative min-h-[80px] sm:min-h-[100px] md:min-h-[120px] p-1 sm:p-2 border-b border-r border-border/30 transition-all hover:bg-accent/50 text-left",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isSelected && "ring-2 ring-primary ring-inset",
                  isTodayDate && "bg-primary/5"
                )}
              >
                <span className={cn(
                  "inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-medium",
                  isTodayDate && "bg-primary text-primary-foreground",
                  !isTodayDate && isCurrentMonth && "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                
                {note && (
                  <div className="mt-1 sm:mt-2">
                    <div className="text-[10px] sm:text-xs line-clamp-2 sm:line-clamp-3 p-1 sm:p-1.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {note.note}
                    </div>
                  </div>
                )}
                
                {!note && isCurrentMonth && (
                  <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 hover:opacity-100">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Note / Task</label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note for this day (e.g., expected load pickup, driver availability, etc.)"
                className="input-dark min-h-[150px]"
                maxLength={1000}
              />
            </div>
            
            <div className="flex justify-between pt-4">
              {editingNote && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
              
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="btn-primary gap-2"
                  disabled={!noteText.trim()}
                >
                  <Save className="h-4 w-4" />
                  {editingNote ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};