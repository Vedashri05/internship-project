import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppContext';
import { runAllocation } from '@/lib/allocation';
import { TimetableSession } from '@/types/exam';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload, Play, FileSpreadsheet, LayoutGrid, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AllocationPage() {
  const { faculties, counters, setAllocationResult, setTotalStudents, currentTerm, timetableSessions, setTimetableSessions } = useAppState();
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const totalBlocks = timetableSessions.reduce((sum, s) => sum + s.total_blocks, 0);
  const totalStudents = timetableSessions.reduce((sum, s) => sum + s.student_count + s.pwd_students, 0);

  const parseTimetable = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          toast.error('Timetable file is empty');
          return;
        }

        const sessions: TimetableSession[] = rows.map(row => {
          const studentCount = Number(row.student_count || row.students || row.Student_Count || 0);
          const pwdStudents = Number(row.pwd_students || row.pwd || row.PwD_Students || 0);
          const normalBlocks = Math.ceil(studentCount / 36);
          const pwdBlocks = pwdStudents > 0 ? Math.ceil(pwdStudents / 36) : 0;

          return {
            exam_date: String(row.exam_date || row.date || row.Date || ''),
            session: String(row.session || row.Session || ''),
            subject: String(row.subject || row.Subject || ''),
            student_count: studentCount,
            pwd_students: pwdStudents,
            normal_blocks: normalBlocks,
            pwd_blocks: pwdBlocks,
            total_blocks: normalBlocks + pwdBlocks,
          };
        });

        setTimetableSessions(sessions);
        toast.success(`Loaded ${sessions.length} exam sessions`);
      } catch {
        toast.error('Failed to parse timetable file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [setTimetableSessions]);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }
    parseTimetable(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleAllocate = () => {
    if (faculties.length === 0) {
      toast.error('Upload faculty data first');
      return;
    }
    if (timetableSessions.length === 0) {
      toast.error('Upload exam timetable first');
      return;
    }

    setTotalStudents(totalStudents);
    const result = runAllocation(faculties, timetableSessions, counters, currentTerm);
    setAllocationResult(result);
    toast.success('Allocation completed for all sessions!');
    navigate('/dashboard/results');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Run Allocation</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload exam timetable and generate session-wise duty allocation</p>
      </div>

      {/* Upload Area */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Exam Timetable Upload
        </h2>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.onchange = (e: any) => { if (e.target.files[0]) handleFile(e.target.files[0]); };
            input.click();
          }}
        >
          <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Drag & drop timetable Excel file or <span className="text-primary font-medium">click to browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Required columns: exam_date, session, subject, student_count, pwd_students
          </p>
        </div>
      </div>

      {/* Preview Table */}
      {timetableSessions.length > 0 && (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Timetable Preview — {timetableSessions.length} sessions</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">PwD</TableHead>
                  <TableHead className="text-right">Blocks</TableHead>
                  <TableHead className="text-right">PwD Blocks</TableHead>
                  <TableHead className="text-right">Total Blocks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetableSessions.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell>{s.exam_date}</TableCell>
                    <TableCell>{s.session}</TableCell>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell className="text-right">{s.student_count}</TableCell>
                    <TableCell className="text-right">{s.pwd_students}</TableCell>
                    <TableCell className="text-right">{s.normal_blocks}</TableCell>
                    <TableCell className="text-right">{s.pwd_blocks}</TableCell>
                    <TableCell className="text-right font-bold">{s.total_blocks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <LayoutGrid className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalBlocks}</p>
              <p className="text-xs text-muted-foreground">Total Blocks</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <Calculator className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <FileSpreadsheet className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{timetableSessions.length}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>

          {/* Faculty info + Run button */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Faculty loaded: <strong className="text-foreground">{faculties.length}</strong></span>
            </div>
            <Button onClick={handleAllocate} className="w-full" size="lg" disabled={faculties.length === 0}>
              <Play className="w-4 h-4 mr-2" /> Generate Allocation for All Sessions
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
