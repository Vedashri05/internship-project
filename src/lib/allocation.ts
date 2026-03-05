import { Faculty, FairnessCounter, AllocationResult } from '@/types/exam';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCounter(counters: Map<string, FairnessCounter>, fid: string): FairnessCounter {
  if (!counters.has(fid)) {
    counters.set(fid, {
      faculty_id: fid,
      jr_sv_count: 0,
      sr_sv_count: 0,
      squad_count: 0,
      total_allocations: 0,
      last_allocated_term: '',
    });
  }
  return counters.get(fid)!;
}

function isSrSVEligible(f: Faculty): boolean {
  const isDesignation = ['HoD', 'Associate Professor', 'Professor'].some(
    d => f.designation.toLowerCase().includes(d.toLowerCase())
  );
  const isPhDWithExp = f.qualification === 'PhD' && f.experience_years >= 10;
  return isDesignation || isPhDWithExp;
}

function isJrSVEligible(f: Faculty): boolean {
  if (f.qualification === 'Graduate' || f.qualification === 'Postgraduate' || f.qualification === 'PhD') {
    if (f.teaching_type === 'Non-Teaching') {
      return f.experience_years >= 5;
    }
    return true;
  }
  return false;
}

export function runAllocation(
  faculties: Faculty[],
  totalStudents: number,
  counters: Map<string, FairnessCounter>,
  currentTerm: string
): AllocationResult {
  const activeFaculty = faculties.filter(f => f.active_status);
  const totalBlocks = Math.ceil(totalStudents / 36);
  const allocated = new Set<string>();

  // --- Senior Supervisors ---
  const srSVRequired = totalStudents < 800 ? 1 : 2;
  const srEligible = activeFaculty.filter(f => isSrSVEligible(f));
  const srSorted = shuffleArray(srEligible).sort((a, b) => {
    const ca = getCounter(counters, a.faculty_id);
    const cb = getCounter(counters, b.faculty_id);
    if (ca.sr_sv_count !== cb.sr_sv_count) return ca.sr_sv_count - cb.sr_sv_count;
    if (ca.last_allocated_term !== cb.last_allocated_term) return ca.last_allocated_term < cb.last_allocated_term ? -1 : 1;
    return b.experience_years - a.experience_years;
  });

  const seniorSupervisors: Faculty[] = [];
  for (const f of srSorted) {
    if (seniorSupervisors.length >= srSVRequired) break;
    seniorSupervisors.push(f);
    allocated.add(f.faculty_id);
    const c = getCounter(counters, f.faculty_id);
    c.sr_sv_count += 1;
    c.total_allocations += 1;
    c.last_allocated_term = currentTerm;
  }

  // --- Junior Supervisors ---
  const jrEligible = activeFaculty.filter(f => isJrSVEligible(f) && !allocated.has(f.faculty_id));
  const jrSorted = shuffleArray(jrEligible).sort((a, b) => {
    // Teaching first
    if (a.teaching_type !== b.teaching_type) {
      return a.teaching_type === 'Teaching' ? -1 : 1;
    }
    const ca = getCounter(counters, a.faculty_id);
    const cb = getCounter(counters, b.faculty_id);
    if (ca.jr_sv_count !== cb.jr_sv_count) return ca.jr_sv_count - cb.jr_sv_count;
    if (ca.last_allocated_term !== cb.last_allocated_term) return ca.last_allocated_term < cb.last_allocated_term ? -1 : 1;
    return 0;
  });

  const juniorSupervisors: { block: number; faculty: Faculty }[] = [];
  const substituteJrSV: Faculty[] = [];
  let jrIdx = 0;

  for (let block = 1; block <= totalBlocks && jrIdx < jrSorted.length; block++) {
    const f = jrSorted[jrIdx++];
    juniorSupervisors.push({ block, faculty: f });
    allocated.add(f.faculty_id);
    const c = getCounter(counters, f.faculty_id);
    c.jr_sv_count += 1;
    c.total_allocations += 1;
    c.last_allocated_term = currentTerm;
  }

  // 2 substitutes
  for (let i = 0; i < 2 && jrIdx < jrSorted.length; i++) {
    const f = jrSorted[jrIdx++];
    substituteJrSV.push(f);
    allocated.add(f.faculty_id);
    const c = getCounter(counters, f.faculty_id);
    c.jr_sv_count += 1;
    c.total_allocations += 1;
    c.last_allocated_term = currentTerm;
  }

  // --- Squads ---
  const squadCount = Math.max(1, Math.floor(totalBlocks / 10));
  const squadEligible = activeFaculty.filter(f => !allocated.has(f.faculty_id));
  const squadSorted = shuffleArray(squadEligible).sort((a, b) => {
    const ca = getCounter(counters, a.faculty_id);
    const cb = getCounter(counters, b.faculty_id);
    if (ca.squad_count !== cb.squad_count) return ca.squad_count - cb.squad_count;
    if (ca.last_allocated_term !== cb.last_allocated_term) return ca.last_allocated_term < cb.last_allocated_term ? -1 : 1;
    return b.experience_years - a.experience_years;
  });

  const squads: { squad: number; members: Faculty[] }[] = [];
  const usedForSquad = new Set<string>();

  for (let s = 1; s <= squadCount; s++) {
    const members: Faculty[] = [];
    const remaining = squadSorted.filter(f => !usedForSquad.has(f.faculty_id));

    // Try to pick 1 female
    const female = remaining.find(f => f.gender.toLowerCase() === 'female');
    if (female) {
      members.push(female);
      usedForSquad.add(female.faculty_id);
    }

    // Try to pick 1 high-experience (>10 years)
    const highExp = remaining.find(f => !usedForSquad.has(f.faculty_id) && f.experience_years >= 10);
    if (highExp) {
      members.push(highExp);
      usedForSquad.add(highExp.faculty_id);
    }

    // Fill remaining to 3
    for (const f of remaining) {
      if (members.length >= 3) break;
      if (!usedForSquad.has(f.faculty_id)) {
        members.push(f);
        usedForSquad.add(f.faculty_id);
      }
    }

    if (members.length > 0) {
      squads.push({ squad: s, members });
      for (const m of members) {
        allocated.add(m.faculty_id);
        const c = getCounter(counters, m.faculty_id);
        c.squad_count += 1;
        c.total_allocations += 1;
        c.last_allocated_term = currentTerm;
      }
    }
  }

  // --- Unallocated ---
  const unallocated = activeFaculty.filter(f => !allocated.has(f.faculty_id));

  return { juniorSupervisors, substituteJrSV, seniorSupervisors, squads, unallocated };
}
