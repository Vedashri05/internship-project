import { useAppState } from '@/context/AppContext';
import { Users, BookOpen, LayoutGrid, CheckCircle } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) => (
  <div className="glass-card rounded-xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const { faculties, totalStudents, allocationResult } = useAppState();
  const totalBlocks = totalStudents > 0 ? Math.ceil(totalStudents / 36) : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of exam duty allocation system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Faculty" value={faculties.length} accent="bg-primary/10 text-primary" />
        <StatCard icon={BookOpen} label="Total Students" value={totalStudents || '—'} accent="bg-accent text-accent-foreground" />
        <StatCard icon={LayoutGrid} label="Total Blocks" value={totalBlocks || '—'} accent="bg-success/10 text-success" />
        <StatCard icon={CheckCircle} label="Allocated" value={allocationResult ? (allocationResult.juniorSupervisors.length + allocationResult.seniorSupervisors.length + allocationResult.squads.reduce((a, s) => a + s.members.length, 0)) : '—'} accent="bg-warning/10 text-warning" />
      </div>

      {allocationResult && (
        <div className="glass-card rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-display font-semibold">Latest Allocation Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><span className="text-muted-foreground">Jr Supervisors:</span> <strong>{allocationResult.juniorSupervisors.length}</strong></div>
            <div><span className="text-muted-foreground">Substitutes:</span> <strong>{allocationResult.substituteJrSV.length}</strong></div>
            <div><span className="text-muted-foreground">Sr Supervisors:</span> <strong>{allocationResult.seniorSupervisors.length}</strong></div>
            <div><span className="text-muted-foreground">Squads:</span> <strong>{allocationResult.squads.length}</strong></div>
          </div>
          <p className="text-sm text-muted-foreground">Unallocated: <strong>{allocationResult.unallocated.length}</strong></p>
        </div>
      )}

      {faculties.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No faculty data uploaded yet. Go to <strong>Faculty Upload</strong> to get started.</p>
        </div>
      )}
    </div>
  );
}
