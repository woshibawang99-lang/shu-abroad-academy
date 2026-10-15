/* ------------------- Student Portal & App Logic (Safe & Guarded) ------------------- */

let currentRole = 'student';
let currentUser = null;
let currentCourseId = 'c1';
let currentWeek = 1;
let studentSlideIndex = 0;
let examTimerInterval = null;
const pendingPracticeEssayFiles = {};

window.onload = async function() {
    initCourseData();
    renderSubjectCards();

    if (!window.supabaseClient) {
        console.error('Supabase client is unavailable.');
        return;
    }

    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) {
        console.error('Unable to restore Supabase session:', error.message);
        return;
    }

    if (data.session?.user) {
        await loadSupabaseUser(data.session.user);
    }
};

async function loadSupabaseUser(authUser) {
    const { data: profile, error } = await window.supabaseClient
        .from('profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();

    if (error || !profile) {
        console.error('Unable to load user profile:', error?.message || 'Profile not found');
        return false;
    }

    currentUser = {
        id: authUser.id,
        role: profile.role,
        username: authUser.email,
        email: authUser.email,
        name: profile.full_name || authUser.email
    };
    currentRole = profile.role;
    try {
        await loadSupabaseLearningContent();
    } catch (contentError) {
        console.error('Unable to load Supabase learning content:', contentError.message);
        alert('Signed in, but online course content could not be loaded. Local backup content will be shown.');
    }
    applyUserSession();
    return true;
}

function openLoginModal(role) {
    switchUserRole(role);
    const modal = document.getElementById('login-screen');
    if (modal) modal.classList.remove('hidden');
}

function closeLoginModal() {
    const modal = document.getElementById('login-screen');
    if (modal) modal.classList.add('hidden');
}

function openDisplayNameEditor() {
    if (!currentUser) return;
    const modal = document.getElementById('display-name-modal');
    const input = document.getElementById('display-name-input');
    if (input) input.value = currentUser.name || '';
    modal?.classList.remove('hidden');
    setTimeout(() => input?.focus(), 50);
}

function closeDisplayNameEditor() {
    document.getElementById('display-name-modal')?.classList.add('hidden');
}

async function saveDisplayName(event) {
    event.preventDefault();
    if (!currentUser || !window.supabaseClient) return;
    const input = document.getElementById('display-name-input');
    const button = document.getElementById('save-display-name-btn');
    const newName = String(input?.value || '').trim().replace(/\s+/g, ' ');
    if (newName.length < 2 || newName.length > 40) {
        alert('Display name must contain 2 to 40 characters.');
        return;
    }
    if (button) { button.disabled = true; button.innerText = 'Saving...'; }
    const { error } = await window.supabaseClient.from('profiles').update({ full_name: newName }).eq('id', currentUser.id);
    if (button) { button.disabled = false; button.innerText = 'Save Name'; }
    if (error) {
        alert(`Unable to change name: ${error.message}`);
        return;
    }
    currentUser.name = newName;
    const nameElement = document.getElementById('user-display-name');
    if (nameElement) nameElement.innerText = newName;
    closeDisplayNameEditor();
}

function switchUserRole(role) {
    currentRole = role;
    const studentBtn = document.getElementById('tab-role-student');
    const teacherBtn = document.getElementById('tab-role-teacher');
    const labelAccount = document.getElementById('label-account');
    const submitBtn = document.getElementById('submit-auth-btn');

    if (role === 'student') {
        if (studentBtn) studentBtn.className = "flex-1 py-2 rounded-lg transition text-white bg-blue-600 shadow-sm font-bold";
        if (teacherBtn) teacherBtn.className = "flex-1 py-2 rounded-lg transition text-slate-600";
        if (labelAccount) labelAccount.innerText = "Student Email";
        if (submitBtn) {
            submitBtn.innerText = "Login as Student";
            submitBtn.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md mt-2";
        }
    } else {
        if (teacherBtn) teacherBtn.className = "flex-1 py-2 rounded-lg transition text-white bg-blue-600 shadow-sm font-bold";
        if (studentBtn) studentBtn.className = "flex-1 py-2 rounded-lg transition text-slate-600";
        if (labelAccount) labelAccount.innerText = "Teacher Email";
        if (submitBtn) {
            submitBtn.innerText = "Enter Teacher Dashboard";
            submitBtn.className = "w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md mt-2";
        }
    }
}

async function handleAccountLogin(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('input-username');
    const passwordInput = document.getElementById('input-password');
    if (!usernameInput || !passwordInput) return;

    const email = usernameInput.value.trim();
    const password = passwordInput.value;
    const requestedRole = currentRole;
    const submitBtn = document.getElementById('submit-auth-btn');

    if (!window.supabaseClient) {
        alert('The database connection is unavailable. Please refresh the page.');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Signing in...';
    }

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error || !data.user) {
        alert(`Login failed: ${error?.message || 'Invalid email or password.'}`);
        if (submitBtn) submitBtn.disabled = false;
        switchUserRole(requestedRole);
        return;
    }

    const loaded = await loadSupabaseUser(data.user);
    if (!loaded) {
        await window.supabaseClient.auth.signOut();
        alert('Login failed: This account does not have a valid profile.');
    } else if (currentUser.role !== requestedRole) {
        const actualRole = currentUser.role;
        await logout();
        alert(`This account is registered as ${actualRole}. Please use the correct login tab.`);
    } else {
        closeLoginModal();
        passwordInput.value = '';
    }

    if (submitBtn) submitBtn.disabled = false;
    switchUserRole(requestedRole);
}

function applyUserSession() {
    if (!currentUser) return;

    const navGuest = document.getElementById('nav-guest-actions');
    const navUser = document.getElementById('nav-user-actions');
    if (navGuest) navGuest.classList.add('hidden');
    if (navUser) navUser.classList.remove('hidden');

    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.innerText = currentUser.name;
    if (roleEl) roleEl.innerText = currentUser.role === 'teacher' ? 'Teacher Console' : 'Online Student';

    const guestBanner = document.getElementById('guest-lock-banner');
    if (guestBanner) guestBanner.classList.add('hidden');

    const learningPortal = document.getElementById('learning-portal');
    if (learningPortal) learningPortal.classList.remove('hidden');

    const teacherPanel = document.getElementById('teacher-publish-panel');
    if (currentUser.role === 'teacher') {
        if (teacherPanel) teacherPanel.classList.remove('hidden');
        loadCourseToEditor();
    } else {
        if (teacherPanel) teacherPanel.classList.add('hidden');
    }

    selectCourse(currentCourseId);
}

async function logout() {
    if (window.supabaseClient) await window.supabaseClient.auth.signOut();
    currentUser = null;
    
    const navGuest = document.getElementById('nav-guest-actions');
    const navUser = document.getElementById('nav-user-actions');
    if (navGuest) navGuest.classList.remove('hidden');
    if (navUser) navUser.classList.add('hidden');

    const teacherPanel = document.getElementById('teacher-publish-panel');
    if (teacherPanel) teacherPanel.classList.add('hidden');

    const learningPortal = document.getElementById('learning-portal');
    if (learningPortal) learningPortal.classList.add('hidden');

    const guestBanner = document.getElementById('guest-lock-banner');
    if (guestBanner) guestBanner.classList.remove('hidden');
}

function renderSubjectCards() {
    const grid = document.getElementById('subject-cards-grid');
    if (!grid) return;
    grid.innerHTML = courseData.courses.map(course => `
        <div onclick="handleCourseCardClick('${course.id}')" class="subject-card bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer shadow-sm flex flex-col justify-between">
            <div class="relative h-28 overflow-hidden">
                <img src="${course.image}" alt="${course.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                <span class="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">${course.badge}</span>
            </div>
            <div class="p-3.5 space-y-1.5 flex-grow">
                <h3 class="font-bold text-slate-900 text-xs">${course.title}</h3>
                <p class="text-[11px] text-slate-500 leading-relaxed line-clamp-2">${course.desc}</p>
            </div>
            <div class="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-semibold text-blue-600">
                <span>${currentUser ? 'Access Syllabus & Testing' : 'Log In to Unlock'}</span>
                <i class="fa-solid fa-arrow-right"></i>
            </div>
        </div>
    `).join('');
}

function handleCourseCardClick(courseId) {
    if (!currentUser) {
        openLoginModal('student');
    } else {
        selectCourse(courseId);
        scrollToLearningPortal();
    }
}

function selectCourse(courseId) {
    currentCourseId = courseId;
    const courseInfo = courseData.courses.find(c => c.id === courseId);
    
    if (courseInfo) {
        const badge = document.getElementById('portal-subject-badge');
        const header = document.getElementById('portal-course-header');
        const degree = document.getElementById('portal-target-degree');

        if (badge) badge.innerText = courseInfo.category || courseInfo.title;
        if (header) header.innerText = `${courseInfo.title} Outline & Prep`;
        if (degree) degree.innerText = courseInfo.targetDegree || 'Master/PhD Degree Programs';
    }

    renderWeekTabs();
    selectWeek(1);
}

function renderWeekTabs() {
    const container = document.getElementById('week-tabs');
    if (!container) return;
    const weeks = courseData.modules[currentCourseId] || [];
    const countEl = document.getElementById('week-count');
    if (countEl) countEl.innerText = `${weeks.length} Module${weeks.length > 1 ? 's' : ''}`;

    if (weeks.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 py-2">No modules available</div>`;
        return;
    }

    container.innerHTML = weeks.map(w => `
        <button onclick="selectWeek(${w.week})" class="w-full text-left px-3 py-2 text-xs rounded-xl border border-slate-100 hover:bg-slate-50 font-medium text-slate-700 transition flex justify-between items-center">
            <span>Week ${w.week} Syllabus</span>
            <i class="fa-solid fa-chevron-right text-[10px] opacity-40"></i>
        </button>
    `).join('');
}

function selectWeek(weekNum) {
    currentWeek = weekNum;
    studentSlideIndex = 0;
    const weeks = courseData.modules[currentCourseId] || [];
    const weekData = weeks.find(w => w.week === weekNum) || weeks[0];

    const titleEl = document.getElementById('lecture-title');
    if (!weekData) {
        if (titleEl) titleEl.innerText = 'No Lecture Content';
        const contentEl = document.getElementById('lecture-content');
        if (contentEl) contentEl.innerHTML = '<p>Please wait for the teacher to publish materials.</p>';
        const vocabBox = document.getElementById('vocab-container');
        if (vocabBox) vocabBox.innerHTML = '';
        const quizBox = document.getElementById('quiz-container');
        if (quizBox) quizBox.innerHTML = '';
        return;
    }

    if (titleEl) titleEl.innerText = weekData.title;

    renderStudentSlide();

    // Vocabularies
    const vocabContainer = document.getElementById('vocab-container');
    if (vocabContainer) {
        vocabContainer.innerHTML = (weekData.vocabs || []).map(v => `
            <div class="bg-slate-50/80 border border-slate-200 p-3 rounded-xl hover:bg-blue-50/40 hover:border-blue-200 transition-colors">
                <div class="font-semibold text-slate-800 text-xs">${v.word}</div>
                <div class="text-[11px] text-slate-500 mt-1 leading-relaxed">${v.def}</div>
            </div>
        `).join('');
    }

    // Quizzes
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) {
        quizContainer.innerHTML = (weekData.quizzes || []).map(q => {
            const isChoice = (q.type || 'choice') === 'choice';

            return `
                <div id="quiz-card-${q.id}" class="p-4 border rounded-2xl bg-slate-50 border-slate-200 space-y-3 text-xs transition-colors">
                    <div class="flex justify-between items-start">
                        <p class="font-bold text-slate-900 text-xs md:text-sm leading-relaxed whitespace-pre-line">${escapeImportedText(q.question)}</p>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ml-2 ${
                            isChoice ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                        }">
                            ${isChoice ? 'Multiple Choice' : 'Essay (Photo Submission)'}
                        </span>
                    </div>

                    ${q.image ? `
                        <div class="pt-1">
                            <img src="${q.image}" alt="Question Diagram" class="quiz-figure-img shadow-sm">
                        </div>
                    ` : ''}

                    ${isChoice ? `
                        <div class="space-y-1.5 pt-1">
                            ${(q.options || []).map(opt => `
                                <label class="quiz-option-label flex items-center space-x-2 text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer transition">
                                    <input type="radio" name="question-${q.id}" value="${opt.charAt(0)}" class="text-blue-600 focus:ring-0">
                                    <span>${escapePortalText(opt)}</span>
                                </label>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="space-y-2 pt-1">
                            <label class="block text-[11px] text-slate-500 font-semibold">Please write your step-by-step solution on paper and upload a photo:</label>
                            <div class="essay-upload-box bg-white p-4 rounded-xl text-center cursor-pointer hover:bg-blue-50/50 transition">
                                <input type="file" accept="image/*" onchange="handleStudentEssayUpload(this, '${q.id}')" class="hidden" id="essay-file-${q.id}">
                                <label for="essay-file-${q.id}" class="cursor-pointer space-y-2 block">
                                    <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-full inline-flex items-center justify-center text-lg">
                                        <i class="fa-solid fa-camera"></i>
                                    </div>
                                    <div class="text-xs text-slate-700 font-semibold">Click to Take / Upload Photo of Hand-written Solution</div>
                                    <div class="text-[10px] text-slate-400">Supports JPG, PNG images</div>
                                </label>
                            </div>
                            <div id="preview-essay-${q.id}" class="hidden pt-2 border-t border-slate-200">
                                <p class="text-[11px] text-emerald-600 font-bold mb-1"><i class="fa-solid fa-circle-check mr-1"></i>Uploaded Solution Photo:</p>
                                <img src="" id="img-essay-${q.id}" class="max-h-48 rounded-xl border border-slate-200 shadow-sm object-contain">
                            </div>
                        </div>
                    `}

                    <div id="quiz-feedback-${q.id}" class="hidden rounded-xl border p-3 space-y-1.5">
                        <div class="quiz-feedback-title font-bold text-xs"></div>
                        <div class="quiz-feedback-answer text-[11px] font-semibold"></div>
                        <div class="quiz-feedback-explanation text-[11px] leading-relaxed"></div>
                    </div>
                </div>
            `;
        }).join('');
        renderMathContent(quizContainer);
    }

    const scoreRes = document.getElementById('score-result');
    if (scoreRes) scoreRes.classList.add('hidden');
    const submitButton = document.getElementById('submit-quiz-btn');
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-60', 'cursor-not-allowed');
        submitButton.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i>Submit Test / Solutions';
    }
    renderStudentExam(weekData);
}

function handleStudentEssayUpload(fileInput, qId) {
    const file = fileInput.files[0];
    if (file) {
        pendingPracticeEssayFiles[qId] = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewBox = document.getElementById(`preview-essay-${qId}`);
            const imgEl = document.getElementById(`img-essay-${qId}`);
            if (imgEl) imgEl.src = e.target.result;
            if (previewBox) previewBox.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function renderStudentSlide() {
    const weeks = courseData.modules[currentCourseId] || [];
    const weekData = weeks.find(w => w.week === currentWeek) || weeks[0];
    if (!weekData) return;

    // Exact one-to-one rule: one slide in the teacher editor is one slide here.
    const slides = weekData.slides || (weekData.lecture ? [weekData.lecture] : ['<p>No content</p>']);
    const total = slides.length;

    if (studentSlideIndex >= total) studentSlideIndex = total - 1;
    if (studentSlideIndex < 0) studentSlideIndex = 0;

    const contentContainer = document.getElementById('lecture-content');
    if (contentContainer) {
        const parser = new DOMParser();
        const decodedDoc = parser.parseFromString(slides[studentSlideIndex], 'text/html');
        contentContainer.innerHTML = decodedDoc.body.innerHTML;
    }

    const badge = document.getElementById('student-slide-badge');
    const footerInd = document.getElementById('student-slide-indicator-footer');
    if (badge) badge.innerText = `Slide ${studentSlideIndex + 1} / ${total}`;
    if (footerInd) footerInd.innerText = `Page ${studentSlideIndex + 1} of ${total}`;

    const dotsContainer = document.getElementById('student-slide-dots');
    if (dotsContainer) {
        let dotsHtml = '';
        for (let i = 0; i < total; i++) {
            dotsHtml += `
                <button onclick="jumpToStudentSlide(${i})" class="w-2.5 h-2.5 rounded-full transition ${
                    i === studentSlideIndex ? 'bg-blue-600 scale-125' : 'bg-slate-300 hover:bg-slate-400'
                }"></button>
            `;
        }
        dotsContainer.innerHTML = dotsHtml;
    }
}

function prevStudentSlide() {
    if (studentSlideIndex > 0) {
        studentSlideIndex--;
        renderStudentSlide();
    }
}

function nextStudentSlide() {
    const weeks = courseData.modules[currentCourseId] || [];
    const weekData = weeks.find(w => w.week === currentWeek) || weeks[0];
    const total = weekData && weekData.slides ? weekData.slides.length : 1;

    if (studentSlideIndex < total - 1) {
        studentSlideIndex++;
        renderStudentSlide();
    }
}

function jumpToStudentSlide(idx) {
    studentSlideIndex = idx;
    renderStudentSlide();
}

async function submitQuiz() {
    const weeks = courseData.modules[currentCourseId] || [];
    const weekData = weeks.find(w => w.week === currentWeek) || weeks[0];
    if (!weekData || !weekData.quizzes) return;

    if (currentUser?.role === 'student' && weekData.practiceAssessmentId) {
        const answers = {};
        const incomplete = [];
        weekData.quizzes.forEach((question, index) => {
            if ((question.type || 'choice') === 'choice') {
                const selected = document.querySelector(`input[name="question-${question.id}"]:checked`);
                if (!selected) incomplete.push(index + 1);
                else answers[question.id] = selected.value;
            } else if (!pendingPracticeEssayFiles[question.id]) {
                incomplete.push(index + 1);
            }
        });
        if (incomplete.length) {
            alert(`Please complete question(s) ${incomplete.join(', ')} before submitting.`);
            return;
        }
        const button = document.getElementById('submit-quiz-btn');
        if (button) { button.disabled = true; button.innerText = 'Submitting...'; }
        try {
            const result = await submitAssessmentToSupabase(
                weekData.practiceAssessmentId,
                weekData.quizzes,
                answers,
                pendingPracticeEssayFiles
            );
            renderSecurePracticeReview(weekData, result);
            return;
        } catch (error) {
            console.error('Online submission failed:', error);
            if (button) { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-paper-plane mr-1.5"></i>Submit Test / Solutions'; }
            alert(`Submission failed: ${error.message}`);
            return;
        }
    }

    let correctChoiceCount = 0;
    let totalChoiceCount = 0;
    let essaySubmittedCount = 0;
    const incompleteQuestions = [];

    weekData.quizzes.forEach((q, index) => {
        const isChoice = (q.type || 'choice') === 'choice';
        if (isChoice) {
            const selected = document.querySelector(`input[name="question-${q.id}"]:checked`);
            if (!selected) incompleteQuestions.push(index + 1);
        } else {
            const previewBox = document.getElementById(`preview-essay-${q.id}`);
            if (!previewBox || previewBox.classList.contains('hidden')) incompleteQuestions.push(index + 1);
        }
    });

    if (incompleteQuestions.length) {
        alert(`Please complete question(s) ${incompleteQuestions.join(', ')} before submitting.`);
        const firstQuestion = weekData.quizzes[incompleteQuestions[0] - 1];
        document.getElementById(`quiz-card-${firstQuestion.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    weekData.quizzes.forEach(q => {
        const isChoice = (q.type || 'choice') === 'choice';
        const card = document.getElementById(`quiz-card-${q.id}`);
        const feedback = document.getElementById(`quiz-feedback-${q.id}`);
        const feedbackTitle = feedback?.querySelector('.quiz-feedback-title');
        const feedbackAnswer = feedback?.querySelector('.quiz-feedback-answer');
        const feedbackExplanation = feedback?.querySelector('.quiz-feedback-explanation');

        if (isChoice) {
            totalChoiceCount++;
            const selected = document.querySelector(`input[name="question-${q.id}"]:checked`);
            const selectedAnswer = (selected?.value || '').trim().toUpperCase();
            const correctAnswer = (q.answer || '').trim().charAt(0).toUpperCase();
            const isCorrect = selectedAnswer === correctAnswer;
            if (isCorrect) correctChoiceCount++;

            card?.querySelectorAll('.quiz-option-label').forEach(label => {
                label.classList.remove('border-emerald-400', 'bg-emerald-50', 'border-rose-400', 'bg-rose-50');
                const radio = label.querySelector('input[type="radio"]');
                const optionAnswer = (radio?.value || '').toUpperCase();
                if (optionAnswer === correctAnswer) label.classList.add('border-emerald-400', 'bg-emerald-50');
                else if (radio?.checked) label.classList.add('border-rose-400', 'bg-rose-50');
                if (radio) radio.disabled = true;
            });

            if (feedback) {
                feedback.className = `rounded-xl border p-3 space-y-1.5 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`;
            }
            if (feedbackTitle) {
                feedbackTitle.className = `quiz-feedback-title font-bold text-xs ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`;
                feedbackTitle.innerHTML = isCorrect
                    ? '<i class="fa-solid fa-circle-check mr-1"></i>Correct'
                    : '<i class="fa-solid fa-circle-xmark mr-1"></i>Incorrect';
            }
            if (feedbackAnswer) {
                feedbackAnswer.className = 'quiz-feedback-answer text-[11px] font-semibold text-slate-700';
                feedbackAnswer.innerText = isCorrect
                    ? `Your answer: ${selectedAnswer} · Correct answer: ${correctAnswer}`
                    : `Your answer: ${selectedAnswer} · Correct answer: ${correctAnswer}`;
            }
            if (feedbackExplanation) {
                feedbackExplanation.className = 'quiz-feedback-explanation text-[11px] leading-relaxed text-slate-600';
                feedbackExplanation.innerHTML = '<strong>Detailed explanation:</strong> ';
                feedbackExplanation.appendChild(document.createTextNode(q.explanation || 'No explanation has been provided yet.'));
            }
        } else {
            const previewBox = document.getElementById(`preview-essay-${q.id}`);
            if (previewBox && !previewBox.classList.contains('hidden')) {
                essaySubmittedCount++;
            }
            if (feedback) feedback.className = 'rounded-xl border p-3 space-y-1.5 bg-purple-50 border-purple-200';
            if (feedbackTitle) {
                feedbackTitle.className = 'quiz-feedback-title font-bold text-xs text-purple-700';
                feedbackTitle.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>Solution submitted';
            }
            if (feedbackAnswer) {
                feedbackAnswer.className = 'quiz-feedback-answer text-[11px] font-semibold text-slate-700';
                feedbackAnswer.innerText = 'Your handwritten solution has been recorded.';
            }
            if (feedbackExplanation) {
                feedbackExplanation.className = 'quiz-feedback-explanation text-[11px] leading-relaxed text-slate-600';
                feedbackExplanation.innerHTML = '<strong>Reference solution and marking guidance:</strong> ';
                feedbackExplanation.appendChild(document.createTextNode(q.explanation || 'No reference solution has been provided yet.'));
            }
        }
    });
    renderMathContent(document.getElementById('quiz-container'));

    let scoreText = '';
    if (totalChoiceCount > 0) {
        scoreText = `Choice Score: ${correctChoiceCount} / ${totalChoiceCount}`;
    } else {
        scoreText = `Assessment Submitted`;
    }

    if (essaySubmittedCount > 0) {
        scoreText += ` (${essaySubmittedCount} hand-written solution photo(s) received)`;
    }

    const scoreTextEl = document.getElementById('score-text');
    const scoreResultEl = document.getElementById('score-result');
    if (scoreTextEl) scoreTextEl.innerText = scoreText;
    if (scoreResultEl) scoreResultEl.classList.remove('hidden');

    const submitButton = document.getElementById('submit-quiz-btn');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add('opacity-60', 'cursor-not-allowed');
        submitButton.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i>Submitted';
    }
    scoreResultEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderSecurePracticeReview(weekData, result) {
    const reviewByQuestion = new Map((result.review || []).map(item => [item.question_id, item]));
    weekData.quizzes.forEach(question => {
        const review = reviewByQuestion.get(question.id);
        const feedback = document.getElementById(`quiz-feedback-${question.id}`);
        if (!feedback || !review) return;
        const correct = (review.question_kind === 'choice') &&
            String(review.selected_answer || '').trim().toUpperCase() === String(review.correct_answer || '').trim().toUpperCase();
        feedback.className = `rounded-xl border p-3 space-y-1.5 ${review.question_kind === 'essay' ? 'bg-purple-50 border-purple-200' : correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`;
        feedback.classList.remove('hidden');
        feedback.querySelector('.quiz-feedback-title').innerText = review.question_kind === 'essay' ? 'Solution submitted for teacher grading' : (correct ? 'Correct' : 'Incorrect');
        feedback.querySelector('.quiz-feedback-answer').innerText = review.question_kind === 'essay'
            ? 'Your handwritten solution photo has been securely uploaded.'
            : `Your answer: ${review.selected_answer || '—'} · Correct answer: ${review.correct_answer || '—'}`;
        feedback.querySelector('.quiz-feedback-explanation').innerText = review.explanation || 'No detailed explanation has been provided yet.';
    });
    const grade = result.grade || {};
    const score = grade.final_score ?? grade.objective_score ?? 0;
    const scoreText = document.getElementById('score-text');
    const scoreBox = document.getElementById('score-result');
    if (scoreText) scoreText.innerText = `Current Score: ${score}${grade.final_score == null ? ' · Written answers are awaiting teacher grading' : ''}`;
    scoreBox?.classList.remove('hidden');
    const button = document.getElementById('submit-quiz-btn');
    if (button) { button.disabled = true; button.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i>Submitted'; }
}

function getExamAttemptKey() {
    return `shu_exam_attempt_${currentUser?.username || 'student'}_${currentCourseId}_${currentWeek}`;
}

function readExamAttempt() {
    try { return JSON.parse(localStorage.getItem(getExamAttemptKey()) || 'null'); }
    catch (error) { return null; }
}

function writeExamAttempt(attempt) {
    localStorage.setItem(getExamAttemptKey(), JSON.stringify(attempt));
}

function renderStudentExam(weekData) {
    if (examTimerInterval) clearInterval(examTimerInterval);
    examTimerInterval = null;
    const exam = weekData.exam || { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
    const locked = document.getElementById('exam-locked-panel');
    const ready = document.getElementById('exam-ready-panel');
    const active = document.getElementById('exam-active-panel');
    const result = document.getElementById('exam-result-panel');
    const countdown = document.getElementById('exam-countdown');
    [locked, ready, active, result].forEach(el => el?.classList.add('hidden'));
    countdown?.classList.add('hidden');

    if (!exam.isOpen) {
        locked?.classList.remove('hidden');
        return;
    }

    const durationLabel = document.getElementById('exam-duration-label');
    if (durationLabel) durationLabel.innerText = `Duration: ${exam.durationMinutes || 60} minutes · ${exam.questions.length} question(s)`;
    const storedAttempt = readExamAttempt();
    const attempt = storedAttempt?.examVersion === (exam.version || 1) ? storedAttempt : null;
    if (attempt?.submitted) {
        showStoredExamResult(attempt);
    } else if (attempt?.startedAt) {
        ready?.classList.remove('hidden');
        if (durationLabel) durationLabel.innerText = 'Your examination is in progress. Continue in the dedicated exam window.';
        const startButton = document.getElementById('start-exam-btn');
        if (startButton) {
            startButton.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square mr-1.5"></i>Continue Exam';
            startButton.onclick = openStudentExamWindow;
        }
    } else {
        ready?.classList.remove('hidden');
        const startButton = document.getElementById('start-exam-btn');
        if (startButton) {
            startButton.innerHTML = '<i class="fa-solid fa-play mr-1.5"></i>Start Exam in New Window';
            startButton.onclick = startStudentExam;
        }
    }
}

function startStudentExam() {
    const weekData = (courseData.modules[currentCourseId] || []).find(w => w.week === currentWeek);
    const exam = weekData?.exam;
    if (!exam?.isOpen || !exam.questions.length) {
        alert('This examination is not currently available.');
        return;
    }
    const attempt = { startedAt: Date.now(), submitted: false, answers: {}, examVersion: exam.version || 1 };
    writeExamAttempt(attempt);
    openStudentExamWindow();
    renderStudentExam(weekData);
}

function openStudentExamWindow() {
    const url = `exam.html?course=${encodeURIComponent(currentCourseId)}&week=${encodeURIComponent(currentWeek)}&user=${encodeURIComponent(currentUser?.username || 'student')}`;
    const examWindow = window.open(url, '_blank');
    if (!examWindow) window.location.href = url;
}

function renderActiveStudentExam(exam, attempt) {
    document.getElementById('exam-locked-panel')?.classList.add('hidden');
    document.getElementById('exam-ready-panel')?.classList.add('hidden');
    document.getElementById('exam-result-panel')?.classList.add('hidden');
    document.getElementById('exam-active-panel')?.classList.remove('hidden');
    document.getElementById('exam-countdown')?.classList.remove('hidden');
    const container = document.getElementById('student-exam-questions');
    if (container) {
        container.innerHTML = exam.questions.map((q, index) => {
            const isChoice = (q.type || 'choice') === 'choice';
            return `<div id="exam-question-${q.id}" class="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3 text-xs">
                <div class="flex justify-between gap-3"><div class="font-bold text-slate-900 text-sm leading-relaxed whitespace-pre-line">${index + 1}. ${escapeImportedText(q.question)}</div><span class="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full h-fit">${isChoice ? 'Multiple Choice' : 'Essay'}</span></div>
                ${q.image ? `<img src="${q.image}" class="quiz-figure-img" alt="Exam question image">` : ''}
                ${isChoice ? `<div class="space-y-1.5">${(q.options || []).map(opt => {
                    const value = opt.charAt(0).toUpperCase();
                    const checked = attempt.answers?.[q.id] === value ? 'checked' : '';
                    return `<label class="exam-option-label flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2.5"><input type="radio" name="exam-${q.id}" value="${value}" ${checked} onchange="saveStudentExamAnswer('${q.id}', this.value)"><span>${escapePortalText(opt)}</span></label>`;
                }).join('')}</div>` : `<div><input type="file" accept="image/*" onchange="handleExamEssayUpload(this, '${q.id}')" class="text-xs"><div id="exam-essay-status-${q.id}" class="text-[11px] text-slate-500 mt-2">Upload a photo of your handwritten solution.</div></div>`}
                <div id="exam-feedback-${q.id}" class="hidden rounded-xl border p-3 text-[11px] leading-relaxed"></div>
            </div>`;
        }).join('');
        renderMathContent(container);
    }
    updateExamCountdown(exam, attempt);
    examTimerInterval = setInterval(() => updateExamCountdown(exam, readExamAttempt() || attempt), 1000);
}

function saveStudentExamAnswer(questionId, value) {
    const attempt = readExamAttempt();
    if (!attempt || attempt.submitted) return;
    attempt.answers = attempt.answers || {};
    attempt.answers[questionId] = value;
    writeExamAttempt(attempt);
}

function handleExamEssayUpload(input, questionId) {
    const status = document.getElementById(`exam-essay-status-${questionId}`);
    if (input.files?.[0] && status) {
        status.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i>Solution photo selected.';
        status.className = 'text-[11px] text-emerald-600 mt-2';
        status.dataset.uploaded = 'true';
    }
}

function updateExamCountdown(exam, attempt) {
    const durationMs = Math.max(1, exam.durationMinutes || 60) * 60 * 1000;
    const remaining = Math.max(0, attempt.startedAt + durationMs - Date.now());
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const countdown = document.getElementById('exam-countdown');
    if (countdown) countdown.innerText = `${minutes}:${seconds}`;
    if (remaining <= 0 && !attempt.submitted) submitStudentExam(true);
}

function submitStudentExam(autoSubmitted = false) {
    const weekData = (courseData.modules[currentCourseId] || []).find(w => w.week === currentWeek);
    const exam = weekData?.exam;
    const attempt = readExamAttempt();
    if (!exam || !attempt || attempt.submitted) return;

    if (!autoSubmitted) {
        const incomplete = exam.questions.map((q, index) => {
            if ((q.type || 'choice') === 'choice') return attempt.answers?.[q.id] ? null : index + 1;
            return document.getElementById(`exam-essay-status-${q.id}`)?.dataset.uploaded === 'true' ? null : index + 1;
        }).filter(Boolean);
        if (incomplete.length) {
            alert(`Please complete exam question(s) ${incomplete.join(', ')} before submitting.`);
            document.getElementById(`exam-question-${exam.questions[incomplete[0] - 1].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    if (examTimerInterval) clearInterval(examTimerInterval);
    let correct = 0;
    let total = 0;
    exam.questions.forEach(q => {
        const feedback = document.getElementById(`exam-feedback-${q.id}`);
        if ((q.type || 'choice') === 'choice') {
            total++;
            const selected = (attempt.answers?.[q.id] || '').toUpperCase();
            const answer = (q.answer || '').charAt(0).toUpperCase();
            const isCorrect = selected === answer;
            if (isCorrect) correct++;
            if (feedback) {
                feedback.className = `rounded-xl border p-3 text-[11px] leading-relaxed ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`;
                feedback.innerText = `${isCorrect ? 'Correct.' : `Incorrect. Your answer: ${selected || 'No answer'}. Correct answer: ${answer}.`} ${q.explanation || ''}`;
            }
            document.querySelectorAll(`input[name="exam-${q.id}"]`).forEach(input => input.disabled = true);
        } else if (feedback) {
            feedback.className = 'rounded-xl border p-3 text-[11px] leading-relaxed bg-violet-50 border-violet-200 text-violet-800';
            feedback.innerText = `Reference solution: ${q.explanation || 'Pending teacher review.'}`;
        }
    });
    renderMathContent(document.getElementById('student-exam-questions'));

    attempt.submitted = true;
    attempt.submittedAt = Date.now();
    attempt.correct = correct;
    attempt.total = total;
    attempt.autoSubmitted = autoSubmitted;
    writeExamAttempt(attempt);
    const button = document.getElementById('submit-exam-btn');
    if (button) { button.disabled = true; button.innerText = 'Submitted'; button.classList.add('opacity-60'); }
    showStoredExamResult(attempt, false);
}

function showStoredExamResult(attempt, hideActive = true) {
    if (hideActive) document.getElementById('exam-active-panel')?.classList.add('hidden');
    document.getElementById('exam-ready-panel')?.classList.add('hidden');
    document.getElementById('exam-countdown')?.classList.add('hidden');
    const result = document.getElementById('exam-result-panel');
    result?.classList.remove('hidden');
    const score = document.getElementById('exam-score-text');
    const note = document.getElementById('exam-result-note');
    if (score) {
        if (attempt.gradingStatus === 'graded') score.innerText = `Final Score: ${attempt.finalScore ?? attempt.autoScore ?? 0} / ${attempt.finalMax ?? attempt.autoMax ?? 0}`;
        else if (attempt.autoMax !== undefined) score.innerText = `Objective Score: ${attempt.autoScore || 0} / ${attempt.autoMax || 0}`;
        else score.innerText = attempt.total > 0 ? `Choice Score: ${attempt.correct} / ${attempt.total}` : 'Exam submitted';
    }
    if (note) {
        if (attempt.gradingStatus === 'pending') note.innerText = 'Written solutions are awaiting teacher grading.';
        else if (attempt.gradingStatus === 'graded') note.innerText = attempt.teacherComment || 'Teacher grading completed.';
        else note.innerText = attempt.autoSubmitted ? 'Time expired. The examination was submitted automatically.' : 'The examination was submitted successfully.';
    }
    result?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToLearningPortal() {
    const el = document.getElementById('learning-portal');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}
