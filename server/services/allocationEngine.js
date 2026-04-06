const BLOCK_SIZE = 36;
const SUBSTITUTE_COUNT = 2;
const HIGH_EXPERIENCE_YEARS = 10;
const SENIOR_FALLBACK_EXPERIENCE_YEARS = 8;

function roleCountKey(role) {
  if (role === 'Sr_SV') return 'sr_sv_count';
  if (role === 'Squad') return 'squad_count';
  return 'jr_sv_count';
}

function normalizeLastAllocatedOrder(counter) {
  if (typeof counter.last_allocated_exam === 'number') {
    return counter.last_allocated_exam;
  }

  const rawValue = counter.last_allocated_term;
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  const numericValue = Number(rawValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function createCounterMap(counters) {
  return new Map(
    counters.map((counter) => [
      counter.faculty_id,
      {
        faculty_id: counter.faculty_id,
        jr_sv_count: counter.jr_sv_count ?? 0,
        sr_sv_count: counter.sr_sv_count ?? 0,
        squad_count: counter.squad_count ?? 0,
        total_allocations: counter.total_allocations ?? 0,
        last_allocated_term: counter.last_allocated_term ?? null,
        last_allocated_exam: counter.last_allocated_exam ?? null,
        last_allocated_order: normalizeLastAllocatedOrder(counter),
      },
    ])
  );
}

function getCounter(counterMap, facultyId) {
  if (!counterMap.has(facultyId)) {
    counterMap.set(facultyId, {
      faculty_id: facultyId,
      jr_sv_count: 0,
      sr_sv_count: 0,
      squad_count: 0,
      total_allocations: 0,
      last_allocated_term: null,
      last_allocated_exam: null,
      last_allocated_order: null,
    });
  }

  return counterMap.get(facultyId);
}

function updateCounter(counterMap, facultyId, role, examId, termLabel) {
  const counter = getCounter(counterMap, facultyId);
  counter[roleCountKey(role)] += 1;
  counter.total_allocations += 1;
  counter.last_allocated_exam = examId;
  counter.last_allocated_term = termLabel;
  counter.last_allocated_order = examId;
}

function calculateBlocks(studentCount) {
  return Math.ceil((Number(studentCount) || 0) / BLOCK_SIZE);
}

function normalizeSchedules(schedules) {
  return schedules.map((schedule) => {
    const studentCount = Number(schedule.student_count ?? schedule.block_required * BLOCK_SIZE ?? 0);
    const blocks = calculateBlocks(studentCount);

    return {
      ...schedule,
      student_count: studentCount,
      block_required: blocks,
      blocks,
    };
  });
}

function buildFacultySummary(faculty) {
  return {
    faculty_id: faculty.faculty_id,
    faculty_name: faculty.name,
    name: faculty.name,
    employee_code: faculty.employee_code,
    dept_id: faculty.dept_id,
    designation: faculty.designation,
    qualification: faculty.qualification,
    experience_years: faculty.experience_years,
    gender: faculty.gender,
  };
}

function compareNullableAscending(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

function buildRandomOrderMap(faculties) {
  const shuffled = [...faculties]
    .map((faculty) => ({ faculty_id: faculty.faculty_id, sort_key: Math.random() }))
    .sort((a, b) => a.sort_key - b.sort_key);

  return new Map(shuffled.map((item, index) => [item.faculty_id, index]));
}

function createFairnessComparator({ counters, randomOrder, role, extraCompare }) {
  return (a, b) => {
    const counterA = getCounter(counters, a.faculty_id);
    const counterB = getCounter(counters, b.faculty_id);
    const roleKey = roleCountKey(role);

    if (counterA[roleKey] !== counterB[roleKey]) {
      return counterA[roleKey] - counterB[roleKey];
    }

    const termCompare = compareNullableAscending(counterA.last_allocated_order, counterB.last_allocated_order);
    if (termCompare !== 0) {
      return termCompare;
    }

    if (typeof extraCompare === 'function') {
      const customCompare = extraCompare(a, b);
      if (customCompare !== 0) {
        return customCompare;
      }
    }

    const randomCompare = (randomOrder.get(a.faculty_id) ?? 0) - (randomOrder.get(b.faculty_id) ?? 0);
    if (randomCompare !== 0) {
      return randomCompare;
    }

    return a.name.localeCompare(b.name);
  };
}

function isSeniorEligible(faculty) {
  const designation = String(faculty.designation ?? '').toLowerCase();
  const qualification = String(faculty.qualification ?? '').toLowerCase();
  const isEligibleDesignation =
    designation.includes('hod') ||
    designation.includes('associate professor') ||
    designation.includes('professor');

  return (isEligibleDesignation || qualification === 'phd') && Number(faculty.experience_years ?? 0) >= HIGH_EXPERIENCE_YEARS;
}

function hasSeniorDesignationOrQualification(faculty) {
  const designation = String(faculty.designation ?? '').toLowerCase();
  const qualification = String(faculty.qualification ?? '').toLowerCase();

  return (
    designation.includes('hod') ||
    designation.includes('associate professor') ||
    designation.includes('professor') ||
    qualification === 'phd'
  );
}

function sortSeniorCandidates(faculties, counters, randomOrder) {
  return [...faculties].sort(
    createFairnessComparator({
      counters,
      randomOrder,
      role: 'Sr_SV',
      extraCompare: (a, b) => Number(b.experience_years ?? 0) - Number(a.experience_years ?? 0),
    })
  );
}

function isJuniorEligible(faculty) {
  if (faculty.teaching_type === 'NT') {
    return faculty.experience_years >= 5;
  }

  return ['Graduate', 'Postgraduate', 'PhD'].includes(faculty.qualification);
}

function selectGlobalSeniorSupervisors(faculties, counters, examId, totalStudents, termLabel, randomOrder) {
  const requiredCount = totalStudents < 800 ? 1 : 2;
  let eligible = sortSeniorCandidates(
    faculties.filter((faculty) => isSeniorEligible(faculty)),
    counters,
    randomOrder
  );

  if (!eligible.length) {
    eligible = sortSeniorCandidates(
      faculties.filter(
        (faculty) =>
          hasSeniorDesignationOrQualification(faculty)
          && Number(faculty.experience_years ?? 0) >= SENIOR_FALLBACK_EXPERIENCE_YEARS
      ),
      counters,
      randomOrder
    );
  }

  // Real uploaded data may not contain HoD/Professor/PhD labels at all.
  // In that case, still guarantee Sr SV selection from the most experienced faculty.
  if (!eligible.length) {
    eligible = sortSeniorCandidates(
      faculties.filter((faculty) => Number(faculty.experience_years ?? 0) >= HIGH_EXPERIENCE_YEARS),
      counters,
      randomOrder
    );
  }

  if (!eligible.length) {
    eligible = sortSeniorCandidates(
      faculties.filter((faculty) => Number(faculty.experience_years ?? 0) >= SENIOR_FALLBACK_EXPERIENCE_YEARS),
      counters,
      randomOrder
    );
  }

  console.log('Eligible Sr SV:', eligible.length);

  const selected = eligible.slice(0, requiredCount);
  for (const faculty of selected) {
    updateCounter(counters, faculty.faculty_id, 'Sr_SV', examId, termLabel);
  }

  console.log('Selected Sr SV:', selected.map((faculty) => ({
    faculty_id: faculty.faculty_id,
    name: faculty.name,
    experience_years: faculty.experience_years,
  })));

  return selected;
}

function getDailyAssignedFacultyIds(dayUsage, examDate) {
  if (!dayUsage.has(examDate)) {
    dayUsage.set(examDate, new Set());
  }

  return dayUsage.get(examDate);
}

function getAvailableCandidates(faculties, sessionUsedFacultyIds, globallyReservedFacultyIds, dayAllocatedFacultyIds, eligibilityCheck) {
  return faculties.filter((faculty) => {
    if (sessionUsedFacultyIds.has(faculty.faculty_id)) return false;
    if (globallyReservedFacultyIds.has(faculty.faculty_id)) return false;
    if (dayAllocatedFacultyIds.has(faculty.faculty_id)) return false;
    if (typeof eligibilityCheck === 'function' && !eligibilityCheck(faculty)) return false;
    return true;
  });
}

function allocateSequentialFaculty({
  faculties,
  count,
  counters,
  randomOrder,
  role,
  eligibilityCheck,
  globallyReservedFacultyIds,
  dayAllocatedFacultyIds,
  sessionUsedFacultyIds,
  extraCompare,
  examId,
  termLabel,
}) {
  const sorted = getAvailableCandidates(
    faculties,
    sessionUsedFacultyIds,
    globallyReservedFacultyIds,
    dayAllocatedFacultyIds,
    eligibilityCheck
  ).sort(
    createFairnessComparator({
      counters,
      randomOrder,
      role,
      extraCompare,
    })
  );

  const selected = sorted.slice(0, count);
  for (const faculty of selected) {
    sessionUsedFacultyIds.add(faculty.faculty_id);
    dayAllocatedFacultyIds.add(faculty.faculty_id);
    updateCounter(counters, faculty.faculty_id, role, examId, termLabel);
  }

  return selected;
}

function isFemaleFaculty(faculty) {
  const gender = String(faculty.gender ?? '').trim().toLowerCase();
  return gender === 'f' || gender === 'female';
}

function pickSquadMembers(eligibleCandidates, counters, randomOrder) {
  const usedFacultyIds = new Set();
  const pool = [...eligibleCandidates];

  const femaleCandidates = pool
    .filter((faculty) => isFemaleFaculty(faculty))
    .sort(
      createFairnessComparator({
        counters,
        randomOrder,
        role: 'Squad',
        extraCompare: (a, b) => Number(b.experience_years ?? 0) - Number(a.experience_years ?? 0),
      })
    );
  const selectedFemale = femaleCandidates[0];
  if (!selectedFemale) {
    return null;
  }

  usedFacultyIds.add(selectedFemale.faculty_id);

  const highExperienceCandidates = pool
    .filter(
      (faculty) => !usedFacultyIds.has(faculty.faculty_id) && Number(faculty.experience_years ?? 0) >= HIGH_EXPERIENCE_YEARS
    )
    .sort((a, b) => Number(b.experience_years ?? 0) - Number(a.experience_years ?? 0));
  const selectedHighExperience = highExperienceCandidates[0];
  if (!selectedHighExperience) {
    return null;
  }

  usedFacultyIds.add(selectedHighExperience.faculty_id);

  const remainingCandidates = pool
    .filter((faculty) => !usedFacultyIds.has(faculty.faculty_id))
    .sort(
      createFairnessComparator({
        counters,
        randomOrder,
        role: 'Squad',
        extraCompare: (a, b) => Number(b.experience_years ?? 0) - Number(a.experience_years ?? 0),
      })
    );
  const selectedThird = remainingCandidates[0];
  if (!selectedThird) {
    return null;
  }

  return [selectedFemale, selectedHighExperience, selectedThird];
}

function allocateSquads({
  faculties,
  squadCount,
  counters,
  randomOrder,
  globallyReservedFacultyIds,
  dayAllocatedFacultyIds,
  sessionUsedFacultyIds,
  examId,
  termLabel,
}) {
  const squads = [];
  const availablePool = getAvailableCandidates(
    faculties,
    sessionUsedFacultyIds,
    globallyReservedFacultyIds,
    dayAllocatedFacultyIds
  );
  const remainingPool = [...availablePool];

  for (let squadNumber = 1; squadNumber <= squadCount; squadNumber += 1) {
    const eligible = remainingPool.sort(
      createFairnessComparator({
        counters,
        randomOrder,
        role: 'Squad',
        extraCompare: (a, b) => b.experience_years - a.experience_years,
      })
    );

    const members = pickSquadMembers(eligible, counters, randomOrder);
    if (!members) {
      break;
    }

    for (const member of members) {
      sessionUsedFacultyIds.add(member.faculty_id);
      dayAllocatedFacultyIds.add(member.faculty_id);
      updateCounter(counters, member.faculty_id, 'Squad', examId, termLabel);
    }

    for (const member of members) {
      const memberIndex = remainingPool.findIndex((faculty) => faculty.faculty_id === member.faculty_id);
      if (memberIndex >= 0) {
        remainingPool.splice(memberIndex, 1);
      }
    }

    squads.push({
      squad_number: squadNumber,
      members,
    });
  }

  console.log('Squads created:', squads.length);

  return squads;
}

function buildSessionUnallocated(faculties, sessionUsedFacultyIds, globallyReservedFacultyIds, dayAllocatedFacultyIds) {
  return faculties
    .filter((faculty) => {
      if (sessionUsedFacultyIds.has(faculty.faculty_id)) return false;
      if (globallyReservedFacultyIds.has(faculty.faculty_id)) return false;
      if (dayAllocatedFacultyIds.has(faculty.faculty_id)) return false;
      return true;
    })
    .map(buildFacultySummary);
}

function buildGlobalUnallocated(faculties, allocatedFacultyIds, globallyReservedFacultyIds) {
  return faculties
    .filter((faculty) => !allocatedFacultyIds.has(faculty.faculty_id) && !globallyReservedFacultyIds.has(faculty.faculty_id))
    .map(buildFacultySummary);
}

function buildSeniorSessionSummary(seniorPool) {
  return seniorPool.map((faculty) => buildFacultySummary(faculty));
}

export function generateAllocation(timetable, facultyData, options = {}) {
  const {
    fairnessCounters = [],
    examId = null,
    examName = '',
  } = options;

  const activeFaculties = facultyData.filter((faculty) => !faculty.is_on_leave);
  const normalizedSchedules = normalizeSchedules(timetable);
  const totalStudents = normalizedSchedules.reduce((sum, schedule) => sum + schedule.student_count, 0);
  const counterMap = createCounterMap(fairnessCounters);
  const randomOrder = buildRandomOrderMap(activeFaculties);
  const termLabel = examName || (examId !== null ? String(examId) : null);
  const warnings = [];
  const allocations = [];
  const sessions = [];
  const dayUsage = new Map();
  const globallyAllocatedFacultyIds = new Set();

  const seniorPool = selectGlobalSeniorSupervisors(
    activeFaculties,
    counterMap,
    examId,
    totalStudents,
    termLabel,
    randomOrder
  );
  const seniorPoolIds = new Set(seniorPool.map((faculty) => faculty.faculty_id));

  for (const senior of seniorPool) {
    globallyAllocatedFacultyIds.add(senior.faculty_id);
  }

  for (const schedule of normalizedSchedules) {
    const dayAllocatedFacultyIds = getDailyAssignedFacultyIds(dayUsage, schedule.exam_date);

    const sessionUsedFacultyIds = new Set(seniorPoolIds);
    const juniorSupervisors = allocateSequentialFaculty({
      faculties: activeFaculties,
      count: schedule.blocks,
      counters: counterMap,
      randomOrder,
      role: 'Jr_SV',
      eligibilityCheck: isJuniorEligible,
      globallyReservedFacultyIds: seniorPoolIds,
      dayAllocatedFacultyIds,
      sessionUsedFacultyIds,
      examId,
      termLabel,
      extraCompare: (a, b) => {
        if (a.teaching_type !== b.teaching_type) {
          return a.teaching_type === 'T' ? -1 : 1;
        }
        return 0;
      },
    });

    const substitutes = allocateSequentialFaculty({
      faculties: activeFaculties,
      count: SUBSTITUTE_COUNT,
      counters: counterMap,
      randomOrder,
      role: 'Jr_SV',
      eligibilityCheck: isJuniorEligible,
      globallyReservedFacultyIds: seniorPoolIds,
      dayAllocatedFacultyIds,
      sessionUsedFacultyIds,
      examId,
      termLabel,
      extraCompare: (a, b) => {
        if (a.teaching_type !== b.teaching_type) {
          return a.teaching_type === 'T' ? -1 : 1;
        }
        return 0;
      },
    });

    const squadsRequired = Math.ceil(schedule.blocks / 10);
    const squads = allocateSquads({
      faculties: activeFaculties,
      squadCount: squadsRequired,
      counters: counterMap,
      randomOrder,
      globallyReservedFacultyIds: seniorPoolIds,
      dayAllocatedFacultyIds,
      sessionUsedFacultyIds,
      examId,
      termLabel,
    });

    if (juniorSupervisors.length < schedule.blocks) {
      warnings.push(`${schedule.subject_name} on ${schedule.exam_date} ${schedule.shift}: junior supervisor shortage.`);
    }
    if (substitutes.length < SUBSTITUTE_COUNT) {
      warnings.push(`${schedule.subject_name} on ${schedule.exam_date} ${schedule.shift}: substitute junior supervisor shortage.`);
    }
    if (squads.length < squadsRequired) {
      warnings.push(`${schedule.subject_name} on ${schedule.exam_date} ${schedule.shift}: squad shortage.`);
    }

    buildSeniorSessionSummary(seniorPool).forEach((faculty) => {
      allocations.push({
        exam_id: examId,
        schedule_id: schedule.schedule_id,
        faculty_id: faculty.faculty_id,
        role: 'Sr_SV',
        block_number: null,
        squad_number: null,
        exam_date: schedule.exam_date,
        shift: schedule.shift,
      });
    });

    juniorSupervisors.forEach((faculty, index) => {
      globallyAllocatedFacultyIds.add(faculty.faculty_id);
      allocations.push({
        exam_id: examId,
        schedule_id: schedule.schedule_id,
        faculty_id: faculty.faculty_id,
        role: 'Jr_SV',
        block_number: index + 1,
        squad_number: null,
        exam_date: schedule.exam_date,
        shift: schedule.shift,
      });
    });

    substitutes.forEach((faculty) => {
      globallyAllocatedFacultyIds.add(faculty.faculty_id);
      allocations.push({
        exam_id: examId,
        schedule_id: schedule.schedule_id,
        faculty_id: faculty.faculty_id,
        role: 'Substitute',
        block_number: null,
        squad_number: null,
        exam_date: schedule.exam_date,
        shift: schedule.shift,
      });
    });

    squads.forEach((squad) => {
      squad.members.forEach((member) => {
        globallyAllocatedFacultyIds.add(member.faculty_id);
        allocations.push({
          exam_id: examId,
          schedule_id: schedule.schedule_id,
          faculty_id: member.faculty_id,
          role: 'Squad',
          block_number: null,
          squad_number: squad.squad_number,
          exam_date: schedule.exam_date,
          shift: schedule.shift,
        });
      });
    });

    sessions.push({
      schedule_id: schedule.schedule_id,
      date: schedule.exam_date,
      exam_date: schedule.exam_date,
      shift: schedule.shift,
      subject: schedule.subject_name,
      subject_name: schedule.subject_name,
      dept_id: schedule.dept_id,
      student_count: schedule.student_count,
      blocks: schedule.blocks,
      block_required: schedule.blocks,
      sr_supervisors: buildSeniorSessionSummary(seniorPool),
      senior_supervisors: buildSeniorSessionSummary(seniorPool),
      jr_supervisors: juniorSupervisors.map((faculty, index) => ({
        block: index + 1,
        block_number: index + 1,
        faculty_id: faculty.faculty_id,
        faculty_name: faculty.name,
        name: faculty.name,
        employee_code: faculty.employee_code,
        dept_id: faculty.dept_id,
      })),
      junior_supervisors: juniorSupervisors.map((faculty, index) => ({
        block: index + 1,
        block_number: index + 1,
        faculty_id: faculty.faculty_id,
        faculty_name: faculty.name,
        name: faculty.name,
        employee_code: faculty.employee_code,
        dept_id: faculty.dept_id,
      })),
      substitutes: substitutes.map((faculty) => buildFacultySummary(faculty)),
      squads: squads.map((squad) => ({
        squad_number: squad.squad_number,
        members: squad.members.map((member) => buildFacultySummary(member)),
      })),
      unallocated: buildSessionUnallocated(
        activeFaculties,
        sessionUsedFacultyIds,
        seniorPoolIds,
        dayAllocatedFacultyIds
      ),
    });
  }

  const srSupervisors = seniorPool.map((faculty) => buildFacultySummary(faculty));
  const unallocated = buildGlobalUnallocated(activeFaculties, globallyAllocatedFacultyIds, seniorPoolIds);

  return {
    exam: {
      exam_id: examId,
      exam_name: examName,
    },
    sr_supervisors: srSupervisors,
    senior_supervisors: srSupervisors,
    sessions,
    allocations,
    counters: Array.from(counterMap.values()).map((counter) => ({
      faculty_id: counter.faculty_id,
      jr_sv_count: counter.jr_sv_count,
      sr_sv_count: counter.sr_sv_count,
      squad_count: counter.squad_count,
      total_allocations: counter.total_allocations,
      last_allocated_term: counter.last_allocated_term,
      last_allocated_exam: counter.last_allocated_exam,
    })),
    unallocated,
    warnings,
    summary: {
      total_sessions: sessions.length,
      total_junior_supervisors: allocations.filter((item) => item.role === 'Jr_SV').length,
      total_senior_supervisors: srSupervisors.length,
      total_squad_members: allocations.filter((item) => item.role === 'Squad').length,
      total_unallocated: unallocated.length,
    },
  };
}

export function generateAllocations({ faculties, fairnessCounters, schedules, examId, examName }) {
  return generateAllocation(schedules, faculties, {
    fairnessCounters,
    examId,
    examName,
  });
}
