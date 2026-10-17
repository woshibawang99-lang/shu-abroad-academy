let standaloneExam = null;
let standaloneAttempt = null;
let standaloneCourseId = '';
let standaloneWeek = 1;
let standaloneTimer = null;
let currentUser = null;
let currentCourseId = '';
const standaloneEssayFiles = {};

window.addEventListener('load', initialiseCloudExam);

async function initialiseCloudExam() {
    try {
        initCourseData();
        const params = new URLSearchParams(location.search);
        standaloneCourseId = params.get('course') || '';
        currentCourseId = standaloneCourseId;
        standaloneWeek = parseInt(params.get('week')) || 1;
        const sessionResult = await window.supabaseClient.auth.getSession();
        const authUser = sessionResult.data.session?.user;
        if (!authUser) return showExamMessage('Login required', 'Return to the course page and log in as a student.');
        const profileResult = await window.supabaseClient.from('profiles').select('full_name, role').eq('id', authUser.id).single();
        if (profileResult.error || profileResult.data.role !== 'student') return showExamMessage('Student account required', 'Only enrolled students can take this examination.');
        currentUser = { id: authUser.id, email: authUser.email, username: authUser.email, name: profileResult.data.full_name, role: profileResult.data.role };
        await loadSupabaseLearningContent();
        const weekData = (courseData.modules[standaloneCourseId] || []).find(week => week.week === standaloneWeek);
        standaloneExam = weekData?.exam;
        document.getElementById('exam-page-title').innerText = weekData?.title || `Week ${standaloneWeek}`;
        if (!standaloneExam?._supabaseId || !standaloneExam.isOpen) return showExamMessage('Exam unavailable', 'The teacher has not opened this examination.');
        let submission = await findLatestExamSubmission();
        if (!submission) {
            const started = await window.supabaseClient.rpc('start_assessment', { target_assessment_id: standaloneExam._supabaseId });
            if (started.error) throw started.error;
            submission = await findLatestExamSubmission();
        }
        if (!submission) throw new Error('The exam attempt could not be created.');
        standaloneAttempt = readStandaloneAttempt() || {};
        standaloneAttempt.submissionId = submission.id;
        standaloneAttempt.deadlineAt = submission.deadline_at;
        standaloneAttempt.answers = standaloneAttempt.answers || {};
        standaloneAttempt.status = submission.status;
        saveStandaloneAttempt();
        if (submission.status === 'submitted' || submission.status === 'graded') return showCloudExamResult(submission.id);
        renderStandaloneQuestions();
        updateStandaloneCountdown();
        standaloneTimer = setInterval(updateStandaloneCountdown, 1000);
    } catch (error) {
        console.error('Exam initialization failed:', error);
        showExamMessage('Unable to open exam', error.message || 'Please return to the course page and try again.');
    }
}

async function findLatestExamSubmission() {
    const result = await window.supabaseClient.from('assessment_submissions').select('*')
        .eq('assessment_id', standaloneExam._supabaseId).eq('student_id', currentUser.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw result.error;
    return result.data;
}

function standaloneAttemptKey() { return `shu_cloud_exam_${currentUser?.id || 'student'}_${standaloneExam?._supabaseId || standaloneCourseId}`; }
function readStandaloneAttempt() { try { return JSON.parse(localStorage.getItem(standaloneAttemptKey()) || 'null'); } catch { return null; } }
function saveStandaloneAttempt() { localStorage.setItem(standaloneAttemptKey(), JSON.stringify(standaloneAttempt)); }

function showExamMessage(title, text) {
    const box = document.getElementById('standalone-exam-message');
    box.classList.remove('hidden');
    box.innerHTML = `<div class="text-xl font-black text-slate-800">${title}</div><div class="text-sm text-slate-500 mt-2">${text}</div>`;
    document.getElementById('standalone-countdown').classList.add('hidden');
}

function renderStandaloneQuestions() {
    const paper = document.getElementById('standalone-exam-paper');
    const nav = document.getElementById('exam-question-nav');
    paper.innerHTML = standaloneExam.questions.map((q, index) => {
        const isChoice = (q.type || 'choice') === 'choice';
        return `<article id="standalone-question-${index}" class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div class="flex justify-between gap-3"><div class="font-bold text-slate-900 leading-relaxed">${index + 1}. ${escapePortalText(q.question)}</div><span class="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full h-fit">${isChoice ? 'Multiple Choice' : 'Written Solution'}</span></div>
            ${q.image ? `<img src="${q.image}" class="max-h-72 object-contain rounded-xl" alt="Question image">` : ''}
            ${isChoice ? `<div class="space-y-2">${(q.options || []).map(opt => { const value = opt.charAt(0).toUpperCase(); return `<label class="flex items-center gap-2 border border-slate-200 rounded-xl p-3 hover:border-violet-300 cursor-pointer"><input type="radio" name="standalone-${q.id}" value="${value}" ${standaloneAttempt.answers?.[q.id] === value ? 'checked' : ''} onchange="saveStandaloneAnswer('${q.id}', this.value, ${index})"><span>${escapePortalText(opt)}</span></label>`; }).join('')}</div>` : `<div class="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center"><input id="essay-file-${q.id}" type="file" accept="image/*" capture="environment" onchange="saveStandaloneEssay(this, '${q.id}', ${index})" class="hidden"><label for="essay-file-${q.id}" class="cursor-pointer"><i class="fa-solid fa-camera text-2xl text-violet-500"></i><div class="font-bold text-sm mt-2">Take a photo or upload your written solution</div><div id="essay-label-${q.id}" class="text-xs text-slate-500 mt-1">JPG / PNG</div></label></div>`}
        </article>`;
    }).join('');
    renderMathContent(paper);
    nav.innerHTML = standaloneExam.questions.map((q, i) => `<button id="nav-question-${i}" onclick="document.getElementById('standalone-question-${i}').scrollIntoView({behavior:'smooth',block:'center'})" class="w-8 h-8 rounded-lg text-xs font-bold border ${standaloneAttempt.answers?.[q.id] || standaloneEssayFiles[q.id] ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-300'}">${i + 1}</button>`).join('');
    document.getElementById('standalone-submit-area').classList.remove('hidden');
}

function saveStandaloneAnswer(id, value, index) { standaloneAttempt.answers[id] = value; saveStandaloneAttempt(); markQuestionAnswered(index); }
function saveStandaloneEssay(input, id, index) {
    const file = input.files?.[0];
    if (!file) return;
    standaloneEssayFiles[id] = file;
    const label = document.getElementById(`essay-label-${id}`);
    if (label) { label.innerText = 'Solution photo ready for secure upload'; label.className = 'text-xs text-emerald-600 mt-1 font-bold'; }
    markQuestionAnswered(index);
}
function markQuestionAnswered(index) { const button = document.getElementById(`nav-question-${index}`); if (button) button.className = 'w-8 h-8 rounded-lg text-xs font-bold border bg-violet-600 text-white border-violet-600'; }

function updateStandaloneCountdown() {
    const end = new Date(standaloneAttempt.deadlineAt).getTime();
    const remaining = Math.max(0, end - Date.now());
    const secondsTotal = Math.ceil(remaining / 1000);
    document.getElementById('standalone-countdown').innerText = `${Math.floor(secondsTotal / 60).toString().padStart(2, '0')}:${(secondsTotal % 60).toString().padStart(2, '0')}`;
    if (remaining <= 0) submitStandaloneExam(true);
}

async function submitStandaloneExam(autoSubmitted) {
    if (!standaloneAttempt || standaloneAttempt.submitting) return;
    if (!autoSubmitted) {
        const missing = standaloneExam.questions.map((q, i) => (q.type || 'choice') === 'choice' ? (standaloneAttempt.answers?.[q.id] ? null : i + 1) : (standaloneEssayFiles[q.id] ? null : i + 1)).filter(Boolean);
        if (missing.length) return alert(`Please complete question(s) ${missing.join(', ')} before submitting.`);
        if (!confirm('Submit the examination now? You cannot change answers after submission.')) return;
    }
    standaloneAttempt.submitting = true;
    clearInterval(standaloneTimer);
    try {
        const result = await submitAssessmentToSupabase(standaloneExam._supabaseId, standaloneExam.questions, standaloneAttempt.answers || {}, standaloneEssayFiles, standaloneAttempt.submissionId);
        standaloneAttempt.status = 'submitted';
        standaloneAttempt.submitting = false;
        standaloneAttempt.grade = result.grade;
        saveStandaloneAttempt();
        renderCloudResult(result.grade);
    } catch (error) {
        standaloneAttempt.submitting = false;
        saveStandaloneAttempt();
        alert(`Exam submission failed: ${formatAssessmentSubmissionError(error)}`);
        if (new Date(standaloneAttempt.deadlineAt).getTime() > Date.now()) standaloneTimer = setInterval(updateStandaloneCountdown, 1000);
    }
}

async function showCloudExamResult(submissionId) {
    const grade = await window.supabaseClient.from('submission_grades').select('*').eq('submission_id', submissionId).maybeSingle();
    if (grade.error) throw grade.error;
    renderCloudResult(grade.data);
}

function renderCloudResult(grade) {
    document.getElementById('standalone-exam-paper').innerHTML = '';
    document.getElementById('standalone-submit-area').classList.add('hidden');
    document.getElementById('standalone-countdown').classList.add('hidden');
    const result = document.getElementById('standalone-result');
    result.classList.remove('hidden');
    const hasEssay = standaloneExam.questions.some(q => (q.type || 'choice') === 'essay');
    const isFullyGraded = !hasEssay || Boolean(grade?.graded_at);
    const score = isFullyGraded ? (grade?.final_score ?? grade?.objective_score ?? 0) : (grade?.objective_score ?? 0);
    result.innerHTML = `<div class="text-xs text-slate-400">Examination submitted securely</div><div class="text-2xl font-black text-violet-300 mt-1">${hasEssay && !isFullyGraded ? `Objective score: ${score}` : `Final score: ${score}`}</div><div class="text-sm text-slate-300 mt-2">${hasEssay && !isFullyGraded ? 'Written solutions are awaiting teacher grading.' : (grade?.teacher_feedback || 'Grading completed.')}</div>`;
}

function highlightSelectedKeyword() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return alert('Select the keyword text first.');
    const range = selection.getRangeAt(0);
    if (!document.getElementById('standalone-exam-paper').contains(range.commonAncestorContainer)) return;
    const mark = document.createElement('mark'); mark.className = 'exam-highlight';
    try { range.surroundContents(mark); selection.removeAllRanges(); } catch { alert('Please select text within a single sentence.'); }
}
function clearKeywordHighlights() { document.querySelectorAll('mark.exam-highlight').forEach(mark => mark.replaceWith(document.createTextNode(mark.textContent))); }
