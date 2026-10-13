/* Supabase learning-content adapter: courses, weeks, slides and vocabulary. */

let supabaseLearningSaveChain = Promise.resolve();
let supabaseAssessmentSaveChain = Promise.resolve();

async function loadSupabaseLearningContent() {
    if (!window.supabaseClient) return false;

    const { data: courses, error: courseError } = await window.supabaseClient
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('title');

    if (courseError) throw courseError;
    if (!courses?.length) return false;

    const courseIds = courses.map(course => course.id);
    const [weeksResult, slidesResult, vocabularyResult] = await Promise.all([
        window.supabaseClient.from('course_weeks').select('*').in('course_id', courseIds).order('week_number'),
        window.supabaseClient.from('slides').select('*').order('slide_number'),
        window.supabaseClient.from('vocabulary').select('*').order('sort_order')
    ]);

    if (weeksResult.error) throw weeksResult.error;
    if (slidesResult.error) throw slidesResult.error;
    if (vocabularyResult.error) throw vocabularyResult.error;

    const weekIds = (weeksResult.data || []).map(week => week.id);
    let assessments = [];
    let questions = [];
    let questionKeys = [];
    if (weekIds.length) {
        const assessmentResult = await window.supabaseClient.from('assessments').select('*').in('week_id', weekIds);
        if (assessmentResult.error) throw assessmentResult.error;
        assessments = assessmentResult.data || [];
        const assessmentIds = assessments.map(item => item.id);
        if (assessmentIds.length) {
            const questionResult = await window.supabaseClient.from('questions').select('*').in('assessment_id', assessmentIds).order('question_number');
            if (questionResult.error) throw questionResult.error;
            questions = questionResult.data || [];
            if (currentUser?.role === 'teacher' && questions.length) {
                const keyResult = await window.supabaseClient.from('question_keys').select('*').in('question_id', questions.map(item => item.id));
                if (keyResult.error) throw keyResult.error;
                questionKeys = keyResult.data || [];
            }
        }
    }

    const localByTitle = new Map(defaultCourseList.map(course => [course.title, course]));
    const previousCourseIdByTitle = new Map((courseData.courses || []).map(course => [course.title, course.id]));
    const previousModules = courseData.modules || {};
    const mappedCourses = courses.map((record, index) => {
        const local = localByTitle.get(record.title) || defaultCourseList[index] || {};
        return {
            ...local,
            id: record.id,
            title: record.title,
            desc: record.description || local.desc || '',
            code: record.code,
            teacherId: record.teacher_id
        };
    });

    const mappedModules = {};
    mappedCourses.forEach(course => {
        const databaseWeeks = (weeksResult.data || []).filter(week => week.course_id === course.id);
        const previousCourseId = previousCourseIdByTitle.get(course.title);
        if (!databaseWeeks.length) {
            mappedModules[course.id] = (previousModules[previousCourseId] || []).map(week => ({
                ...week,
                slides: [...(week.slides || [])],
                vocabs: (week.vocabs || []).map(item => ({ ...item })),
                quizzes: (week.quizzes || []).map(item => ({ ...item })),
                exam: week.exam ? { ...week.exam, questions: (week.exam.questions || []).map(item => ({ ...item })) } : { isOpen: false, durationMinutes: 60, questions: [], version: 1 }
            }));
            return;
        }
        mappedModules[course.id] = databaseWeeks.map(week => {
            const localFallback = Object.values(previousModules).flat().find(item =>
                item.week === week.week_number && item.title === week.title
            );
            const practiceAssessment = assessments.find(item => item.week_id === week.id && item.kind === 'practice');
            const examAssessment = assessments.find(item => item.week_id === week.id && item.kind === 'exam');
            const mapQuestions = assessment => !assessment ? [] : questions
                .filter(question => question.assessment_id === assessment.id)
                .sort((a, b) => a.question_number - b.question_number)
                .map(question => {
                    const key = questionKeys.find(item => item.question_id === question.id);
                    return {
                        id: question.id,
                        _supabaseId: question.id,
                        type: question.kind,
                        question: question.question_text,
                        image: question.image_path || '',
                        options: Array.isArray(question.options) ? question.options : [],
                        points: Number(question.points) || (question.kind === 'essay' ? 10 : 1),
                        answer: key?.correct_answer || '',
                        explanation: key?.explanation || ''
                    };
                });
            return {
                _supabaseId: week.id,
                week: week.week_number,
                title: week.title,
                isPublished: week.is_published,
                slides: (slidesResult.data || [])
                    .filter(slide => slide.week_id === week.id)
                    .sort((a, b) => a.slide_number - b.slide_number)
                    .map(slide => slide.content_html),
                vocabs: (vocabularyResult.data || [])
                    .filter(item => item.week_id === week.id)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(item => ({ word: item.term, def: item.definition })),
                quizzes: practiceAssessment ? mapQuestions(practiceAssessment) : (localFallback?.quizzes || []),
                practiceAssessmentId: practiceAssessment?.id || null,
                exam: examAssessment ? {
                    _supabaseId: examAssessment.id,
                    isOpen: examAssessment.is_open,
                    durationMinutes: examAssessment.duration_minutes || 60,
                    questions: mapQuestions(examAssessment),
                    version: 1
                } : (localFallback?.exam || { isOpen: false, durationMinutes: 60, questions: [], version: 1 })
            };
        });
    });

    courseData.courses = mappedCourses;
    courseData.modules = mappedModules;
    currentCourseId = mappedCourses[0].id;
    refreshCourseSelectOptions();
    if (typeof renderSubjectCards === 'function') renderSubjectCards();
    return true;
}

function refreshCourseSelectOptions() {
    const select = document.getElementById('editor-course-select');
    if (!select || !courseData?.courses) return;
    const oldValue = select.value;
    select.innerHTML = courseData.courses
        .map(course => `<option value="${course.id}">${escapeHtmlAttribute(course.title)}</option>`)
        .join('');
    if (courseData.courses.some(course => course.id === oldValue)) select.value = oldValue;
}

function queueLearningWeekSave(courseId, weekData) {
    supabaseLearningSaveChain = supabaseLearningSaveChain
        .catch(() => undefined)
        .then(() => saveLearningWeekToSupabase(courseId, weekData));
    return supabaseLearningSaveChain;
}

async function saveLearningWeekToSupabase(courseId, weekData) {
    if (!window.supabaseClient || !currentUser || currentUser.role !== 'teacher') return;
    const result = await window.supabaseClient.rpc('save_learning_week_content', {
        target_course_id: courseId,
        target_week_number: weekData.week,
        target_title: weekData.title || '',
        slide_contents: weekData.slides || [],
        vocabulary_items: (weekData.vocabs || []).map(item => ({
            word: item.word || '',
            def: item.def || ''
        }))
    });
    if (result.error) throw result.error;
    weekData._supabaseId = result.data;

    const verification = await window.supabaseClient
        .from('slides')
        .select('slide_number, content_html')
        .eq('week_id', result.data)
        .order('slide_number');
    if (verification.error) throw verification.error;
    const expectedSlides = weekData.slides || [];
    const savedSlides = verification.data || [];
    const isExactMatch = savedSlides.length === expectedSlides.length
        && savedSlides.every((slide, index) => slide.slide_number === index + 1 && slide.content_html === expectedSlides[index]);
    if (!isExactMatch) {
        throw new Error(`Slide verification failed: expected ${expectedSlides.length}, database returned ${savedSlides.length}.`);
    }
}

function queueAssessmentSave(weekData) {
    supabaseAssessmentSaveChain = supabaseAssessmentSaveChain
        .catch(() => undefined)
        .then(() => saveWeekAssessmentsToSupabase(weekData));
    return supabaseAssessmentSaveChain;
}

async function saveWeekAssessmentsToSupabase(weekData) {
    if (!window.supabaseClient || currentUser?.role !== 'teacher' || !weekData?._supabaseId) return;
    const [practice, examId] = await Promise.all([
        saveOneAssessment(weekData, 'practice', {
            id: weekData.practiceAssessmentId,
            title: 'Practice Test & Assessment',
            durationMinutes: 60,
            isOpen: true,
            questions: weekData.quizzes || []
        }),
        saveOneAssessment(weekData, 'exam', {
            id: weekData.exam?._supabaseId,
            title: 'Timed Examination',
            durationMinutes: weekData.exam?.durationMinutes || 60,
            isOpen: Boolean(weekData.exam?.isOpen),
            questions: weekData.exam?.questions || []
        })
    ]);
    weekData.practiceAssessmentId = practice;
    if (weekData.exam) weekData.exam._supabaseId = examId;
}

async function saveOneAssessment(weekData, kind, model) {
    const payload = {
        week_id: weekData._supabaseId,
        kind,
        title: model.title,
        duration_minutes: model.durationMinutes,
        is_open: model.isOpen,
        opens_at: model.isOpen ? new Date().toISOString() : null,
        closes_at: null
    };
    let assessmentId = model.id;
    if (!assessmentId) {
        const existing = await window.supabaseClient.from('assessments').select('id').eq('week_id', weekData._supabaseId).eq('kind', kind).maybeSingle();
        if (existing.error) throw existing.error;
        assessmentId = existing.data?.id;
    }
    if (assessmentId) {
        const { error } = await window.supabaseClient.from('assessments').update(payload).eq('id', assessmentId);
        if (error) throw error;
    } else {
        const inserted = await window.supabaseClient.from('assessments').insert(payload).select('id').single();
        if (inserted.error) throw inserted.error;
        assessmentId = inserted.data.id;
    }

    const existingQuestions = await window.supabaseClient.from('questions').select('id, question_number').eq('assessment_id', assessmentId);
    if (existingQuestions.error) throw existingQuestions.error;
    const savedQuestions = await Promise.all(model.questions.map(async (question, index) => {
        const existing = existingQuestions.data?.find(item => item.question_number === index + 1);
        const questionPayload = {
            assessment_id: assessmentId,
            question_number: index + 1,
            kind: question.type || 'choice',
            question_text: question.question || '',
            image_path: question.image || null,
            options: question.type === 'essay' ? [] : (question.options || []),
            points: Number(question.points) || (question.type === 'essay' ? 10 : 1)
        };
        let questionId = existing?.id;
        if (questionId) {
            const { error } = await window.supabaseClient.from('questions').update(questionPayload).eq('id', questionId);
            if (error) throw error;
        } else {
            const inserted = await window.supabaseClient.from('questions').insert(questionPayload).select('id').single();
            if (inserted.error) throw inserted.error;
            questionId = inserted.data.id;
        }
        question.id = questionId;
        question._supabaseId = questionId;
        return {
            question_id: questionId,
            correct_answer: question.answer || '',
            explanation: question.explanation || ''
        };
    }));
    if (savedQuestions.length) {
        const { error: keyError } = await window.supabaseClient.from('question_keys').upsert(savedQuestions, { onConflict: 'question_id' });
        if (keyError) throw keyError;
    }
    const retainedIds = savedQuestions.map(item => item.question_id);
    const staleIds = (existingQuestions.data || []).map(item => item.id).filter(id => !retainedIds.includes(id));
    if (staleIds.length) {
        const { error } = await window.supabaseClient.from('questions').delete().in('id', staleIds);
        if (error) throw error;
    }
    return assessmentId;
}

async function uploadTeacherMaterial(file, materialType = 'document') {
    if (!window.supabaseClient || !currentUser || currentUser.role !== 'teacher') {
        throw new Error('Teacher login is required before uploading files.');
    }

    const courseId = document.getElementById('editor-course-select')?.value || 'course';
    const weekNumber = document.getElementById('editor-week-select')?.value || '1';
    const safeName = file.name
        .normalize('NFKD')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'document';
    const path = `${currentUser.id}/${courseId}/week-${weekNumber}/${materialType}/${Date.now()}-${safeName}`;

    const { error } = await window.supabaseClient.storage
        .from('teacher-materials')
        .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return path;
}

async function submitAssessmentToSupabase(assessmentId, questions, answers, essayFiles = {}, existingSubmissionId = null) {
    if (!window.supabaseClient || currentUser?.role !== 'student') {
        throw new Error('Student login is required.');
    }

    if (!existingSubmissionId) {
        const started = await window.supabaseClient.rpc('start_assessment', {
            target_assessment_id: assessmentId
        });
        if (started.error) throw started.error;
    }

    let submissionQuery = window.supabaseClient.from('assessment_submissions').select('*');
    if (existingSubmissionId) submissionQuery = submissionQuery.eq('id', existingSubmissionId);
    else submissionQuery = submissionQuery.eq('assessment_id', assessmentId).eq('student_id', currentUser.id).order('created_at', { ascending: false }).limit(1);
    const submissionResult = await submissionQuery.single();
    if (submissionResult.error) throw submissionResult.error;
    const submission = submissionResult.data;

    const answerRows = [];
    for (const question of questions) {
        let uploadPath = null;
        const file = essayFiles[question.id];
        if (file) {
            const extension = (file.name.split('.').pop() || 'jpg').replace(/[^A-Za-z0-9]/g, '');
            uploadPath = `${currentUser.id}/${submission.id}/${question.id}-${Date.now()}.${extension}`;
            const upload = await window.supabaseClient.storage
                .from('student-submissions')
                .upload(uploadPath, file, { cacheControl: '3600', upsert: false });
            if (upload.error) throw upload.error;
        }
        answerRows.push({
            submission_id: submission.id,
            question_id: question.id,
            selected_answer: answers[question.id] || null,
            upload_path: uploadPath
        });
    }

    const removed = await window.supabaseClient.from('student_answers').delete().eq('submission_id', submission.id);
    if (removed.error) throw removed.error;
    if (answerRows.length) {
        const inserted = await window.supabaseClient.from('student_answers').insert(answerRows);
        if (inserted.error) throw inserted.error;
    }

    const submitted = await window.supabaseClient.rpc('submit_assessment', {
        target_submission_id: submission.id
    });
    if (submitted.error) throw submitted.error;

    const [gradeResult, reviewResult] = await Promise.all([
        window.supabaseClient.from('submission_grades').select('*').eq('submission_id', submission.id).maybeSingle(),
        window.supabaseClient.rpc('get_submission_review', { target_submission_id: submission.id })
    ]);
    if (gradeResult.error) throw gradeResult.error;
    if (reviewResult.error) throw reviewResult.error;
    return { submission, grade: gradeResult.data, review: reviewResult.data || [] };
}

