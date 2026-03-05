import { useAppState } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export default function ResultsPage() {
  const { allocationResult } = useAppState();

  if (!allocationResult) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-display font-bold">Results</h1>
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          No allocation has been run yet. Go to <strong>Allocation</strong> page first.
        </div>
      </div>
    );
  }

  const { juniorSupervisors, substituteJrSV, seniorSupervisors, squads, unallocated } = allocationResult;

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 - Jr SV
    const jrData = juniorSupervisors.map(j => ({ Block: j.block, 'Faculty Name': j.faculty.name }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jrData), 'Junior Supervisors');

    // Sheet 2 - Substitute Jr SV
    const subData = substituteJrSV.map(f => ({ 'Faculty Name': f.name }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(subData), 'Substitute Jr SV');

    // Sheet 3 - Sr SV
    const srData = seniorSupervisors.map(f => ({ 'Faculty Name': f.name }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(srData), 'Senior Supervisors');

    // Sheet 4 - Squads
    const sqData = squads.map(s => {
      const row: any = { Squad: s.squad };
      s.members.forEach((m, i) => { row[`Member${i + 1}`] = m.name; });
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sqData), 'Squads');

    // Sheet 5 - Unallocated
    const unData = unallocated.map(f => ({ 'Faculty Name': f.name }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unData), 'Unallocated Faculty');

    XLSX.writeFile(wb, 'Exam_Duty_Allocation.xlsx');
    toast.success('Excel file downloaded');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Allocation Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and download duty allocation</p>
        </div>
        <Button onClick={downloadExcel}>
          <Download className="w-4 h-4 mr-2" /> Download Excel
        </Button>
      </div>

      <Tabs defaultValue="jr-sv">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="jr-sv">Jr SV ({juniorSupervisors.length})</TabsTrigger>
          <TabsTrigger value="sub-jr">Subs ({substituteJrSV.length})</TabsTrigger>
          <TabsTrigger value="sr-sv">Sr SV ({seniorSupervisors.length})</TabsTrigger>
          <TabsTrigger value="squads">Squads ({squads.length})</TabsTrigger>
          <TabsTrigger value="unalloc">Unalloc ({unallocated.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="jr-sv" className="glass-card rounded-xl overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Block</TableHead>
                <TableHead>Faculty Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {juniorSupervisors.map(j => (
                <TableRow key={j.block}>
                  <TableCell className="font-bold">{j.block}</TableCell>
                  <TableCell>{j.faculty.name}</TableCell>
                  <TableCell>{j.faculty.department}</TableCell>
                  <TableCell>{j.faculty.teaching_type}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="sub-jr" className="glass-card rounded-xl overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Faculty Name</TableHead><TableHead>Department</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {substituteJrSV.map(f => (
                <TableRow key={f.faculty_id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.department}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="sr-sv" className="glass-card rounded-xl overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Faculty Name</TableHead><TableHead>Designation</TableHead><TableHead>Experience</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {seniorSupervisors.map(f => (
                <TableRow key={f.faculty_id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.designation}</TableCell>
                  <TableCell>{f.experience_years} yrs</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="squads" className="glass-card rounded-xl overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Squad</TableHead>
                <TableHead>Member 1</TableHead>
                <TableHead>Member 2</TableHead>
                <TableHead>Member 3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {squads.map(s => (
                <TableRow key={s.squad}>
                  <TableCell className="font-bold">{s.squad}</TableCell>
                  {[0, 1, 2].map(i => (
                    <TableCell key={i}>{s.members[i]?.name || '—'}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="unalloc" className="glass-card rounded-xl overflow-hidden mt-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Faculty Name</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {unallocated.map(f => (
                <TableRow key={f.faculty_id}>
                  <TableCell>{f.name}</TableCell>
                  <TableCell>{f.department}</TableCell>
                  <TableCell>{f.designation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
