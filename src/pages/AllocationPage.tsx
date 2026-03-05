import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppContext';
import { runAllocation } from '@/lib/allocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calculator, Play, LayoutGrid } from 'lucide-react';

export default function AllocationPage() {
  const { faculties, totalStudents, setTotalStudents, counters, setAllocationResult, currentTerm } = useAppState();
  const [studentInput, setStudentInput] = useState(totalStudents > 0 ? String(totalStudents) : '');
  const navigate = useNavigate();

  const totalBlocks = studentInput ? Math.ceil(Number(studentInput) / 36) : 0;
  const srRequired = Number(studentInput) < 800 ? 1 : 2;
  const squadCount = Math.max(1, Math.floor(totalBlocks / 10));

  const handleAllocate = () => {
    const students = Number(studentInput);
    if (!students || students <= 0) {
      toast.error('Enter a valid number of students');
      return;
    }
    if (faculties.length === 0) {
      toast.error('Upload faculty data first');
      return;
    }

    setTotalStudents(students);
    const result = runAllocation(faculties, students, counters, currentTerm);
    setAllocationResult(result);
    toast.success('Allocation completed successfully!');
    navigate('/dashboard/results');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Run Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter the number of students and generate duty allocation</p>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="students">Total Number of Students</Label>
          <Input
            id="students"
            type="number"
            placeholder="e.g. 720"
            value={studentInput}
            onChange={e => setStudentInput(e.target.value)}
            className="text-lg"
          />
        </div>

        {totalBlocks > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <LayoutGrid className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalBlocks}</p>
              <p className="text-xs text-muted-foreground">Blocks</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <Calculator className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{srRequired}</p>
              <p className="text-xs text-muted-foreground">Sr Supervisors</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <Calculator className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{squadCount}</p>
              <p className="text-xs text-muted-foreground">Squads</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Faculty loaded: <strong className="text-foreground">{faculties.length}</strong></span>
        </div>

        <Button onClick={handleAllocate} className="w-full" size="lg" disabled={faculties.length === 0}>
          <Play className="w-4 h-4 mr-2" /> Generate Allocation
        </Button>
      </div>
    </div>
  );
}
