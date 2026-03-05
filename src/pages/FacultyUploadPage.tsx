import { useCallback, useState } from 'react';
import { useAppState } from '@/context/AppContext';
import { Faculty } from '@/types/exam';
import { Upload, FileSpreadsheet, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function FacultyUploadPage() {
  const { faculties, setFaculties } = useAppState();
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        const parsed: Faculty[] = json.map((row: any, idx: number) => ({
          faculty_id: row.faculty_id || `FAC-${idx + 1}`,
          name: row.name || '',
          gender: row.gender || 'Male',
          department: row.department || '',
          teaching_type: row.teaching_type === 'Non-Teaching' ? 'Non-Teaching' : 'Teaching',
          qualification: (['Graduate', 'Postgraduate', 'PhD'].includes(row.qualification) ? row.qualification : 'Graduate') as Faculty['qualification'],
          designation: row.designation || '',
          experience_years: Number(row.experience_years) || 0,
          active_status: row.active_status !== false && row.active_status !== 'false' && row.active_status !== 0,
        }));

        setFaculties(parsed);
        toast.success(`${parsed.length} faculty records loaded`);
      } catch {
        toast.error('Error reading Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [setFaculties]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Faculty Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload an Excel file with faculty data</p>
      </div>

      <div
        className={`glass-card rounded-xl p-10 border-2 border-dashed text-center transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Upload className="w-7 h-7 text-primary" />
        </div>
        <p className="font-medium text-foreground">Drop your Excel file here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">Accepts .xlsx, .xls files</p>
        <input id="file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileInput} />
      </div>

      {faculties.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <span className="font-semibold">{faculties.length} Faculty Records</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFaculties([]); toast.info('Faculty data cleared'); }}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Exp (yrs)</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faculties.slice(0, 100).map(f => (
                  <TableRow key={f.faculty_id}>
                    <TableCell className="font-mono text-xs">{f.faculty_id}</TableCell>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.gender}</TableCell>
                    <TableCell>{f.department}</TableCell>
                    <TableCell>
                      <Badge variant={f.teaching_type === 'Teaching' ? 'default' : 'secondary'}>
                        {f.teaching_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.qualification}</TableCell>
                    <TableCell>{f.designation}</TableCell>
                    <TableCell>{f.experience_years}</TableCell>
                    <TableCell>{f.active_status ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
