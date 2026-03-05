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

  const { sessions, unallocated } = allocationResult;

  const totalJrSV = sessions.reduce((s, r) => s + r.juniorSupervisors.length, 0);
  const totalSrSV = sessions.reduce((s, r) => s + r.seniorSupervisors.length, 0);
  const totalSquadMembers = sessions.reduce((s, r) => s + r.squads.reduce((a, sq) => a + sq.members.length, 0), 0);

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Session-wise Jr SV Allocation
    const jrData = sessions.flatMap(s =>
      s.juniorSupervisors.map(j => ({
        Date: s.exam_date,
        Session: s.session,
        Subject: s.subject,
        Block: j.block,
        'Block Type': j.isPwd ? 'PwD' : 'Normal',
        Role: 'Jr SV',
        'Faculty Name': j.faculty.name,
        Department: j.faculty.department,
      }))
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jrData), 'Session-wise Allocation');

    // Sheet 2 — Senior Supervisors
    const srData = sessions.flatMap(s =>
      s.seniorSupervisors.map(f => ({
        Date: s.exam_date,
        Session: s.session,
        'Faculty Name': f.name,
        Designation: f.designation,
        Experience: f.experience_years,
      }))
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(srData), 'Senior Supervisors');

    // Sheet 3 — Squads
    const sqData = sessions.flatMap(s =>
      s.squads.flatMap(sq =>
        sq.members.map((m, i) => ({
          Date: s.exam_date,
          Session: s.session,
          Squad: sq.squad,
          [`Member`]: m.name,
          Role: i === 0 ? 'Lead' : 'Member',
        }))
      )
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sqData), 'Squads');

    // Sheet 4 — Unallocated
    const unData = unallocated.map(f => ({ 'Faculty Name': f.name, Department: f.department, Designation: f.designation }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unData), 'Unallocated Faculty');

    XLSX.writeFile(wb, 'Exam_Duty_Allocation.xlsx');
    toast.success('Excel file downloaded');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Allocation Results</h1>
          <p className="text-sm text-muted-foreground mt-1">{sessions.length} session(s) allocated</p>
        </div>
        <Button onClick={downloadExcel}>
          <Download className="w-4 h-4 mr-2" /> Download Excel
        </Button>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="sessions">Jr SV ({totalJrSV})</TabsTrigger>
          <TabsTrigger value="sr-sv">Sr SV ({totalSrSV})</TabsTrigger>
          <TabsTrigger value="squads">Squads ({totalSquadMembers})</TabsTrigger>
          <TabsTrigger value="unalloc">Unalloc ({unallocated.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          {sessions.map((s, si) => (
            <div key={si} className="glass-card rounded-xl overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <span className="font-semibold">{s.exam_date} — {s.session}</span>
                <span className="text-muted-foreground ml-2 text-sm">({s.subject}, {s.totalBlocks} blocks)</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Faculty Name</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.juniorSupervisors.map(j => (
                    <TableRow key={j.block}>
                      <TableCell className="font-bold">{j.block}</TableCell>
                      <TableCell>{j.isPwd ? <span className="text-warning font-medium">PwD</span> : 'Normal'}</TableCell>
                      <TableCell>{j.faculty.name}</TableCell>
                      <TableCell>{j.faculty.department}</TableCell>
                    </TableRow>
                  ))}
                  {s.substituteJrSV.length > 0 && s.substituteJrSV.map((f, i) => (
                    <TableRow key={`sub-${i}`} className="bg-muted/20">
                      <TableCell className="italic text-muted-foreground">Sub {i + 1}</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{f.department}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sr-sv" className="space-y-4 mt-4">
          {sessions.map((s, si) => (
            <div key={si} className="glass-card rounded-xl overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <span className="font-semibold">{s.exam_date} — {s.session}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Faculty Name</TableHead><TableHead>Designation</TableHead><TableHead>Experience</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {s.seniorSupervisors.map(f => (
                    <TableRow key={f.faculty_id}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{f.designation}</TableCell>
                      <TableCell>{f.experience_years} yrs</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="squads" className="space-y-4 mt-4">
          {sessions.map((s, si) => (
            <div key={si} className="glass-card rounded-xl overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <span className="font-semibold">{s.exam_date} — {s.session}</span>
              </div>
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
                  {s.squads.map(sq => (
                    <TableRow key={sq.squad}>
                      <TableCell className="font-bold">{sq.squad}</TableCell>
                      {[0, 1, 2].map(i => (
                        <TableCell key={i}>{sq.members[i]?.name || '—'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
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
