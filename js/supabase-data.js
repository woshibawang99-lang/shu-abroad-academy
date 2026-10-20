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
        const previousCourseWeeks = previousModules[previousCourseId] || [];
        if (!databaseWeeks.length) {
            mappedModules[course.id] = previousCourseWeeks.map(week => ({
                ...week,
                slides: [...(week.slides || [])],
                vocabs: (week.vocabs || []).map(item => ({ ...item })),
                quizzes: (week.quizzes || []).map(item => ({ ...item })),
                exam: week.exam ? { ...week.exam, questions: (week.exam.questions || []).map(item => ({ ...item })) } : { isOpen: false, durationMinutes: 60, questions: [], version: 1 }
            }));
            return;
        }
        const mappedDatabaseWeeks = databaseWeeks.map(week => {
            const localFallback = previousCourseWeeks.find(item => item.week === week.week_number)
                || Object.values(previousModules).flat().find(item => item.week === week.week_number && item.title === week.title);
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
            const databaseSlides = (slidesResult.data || [])
                .filter(slide => slide.week_id === week.id)
                .sort((a, b) => a.slide_number - b.slide_number)
                .map(slide => slide.content_html);
            const recoveredSlides = currentUser?.role === 'teacher'
                && (localFallback?.slides || []).length > databaseSlides.length
                ? [...localFallback.slides]
                : databaseSlides;
            return {
                _supabaseId: week.id,
                week: week.week_number,
                title: week.title,
                isPublished: week.is_published,
                slides: recoveredSlides,
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
        const localOnlyWeeks = currentUser?.role === 'teacher'
            ? previousCourseWeeks.filter(localWeek =>
                !databaseWeeks.some(databaseWeek => databaseWeek.week_number === localWeek.week)
            ).map(week => ({
                ...week,
                slides: [...(week.slides || [])],
                vocabs: (week.vocabs || []).map(item => ({ ...item })),
                quizzes: (week.quizzes || []).map(item => ({ ...item })),
                exam: week.exam ? { ...week.exam, questions: (week.exam.questions || []).map(item => ({ ...item })) } : { isOpen: false, durationMinutes: 60, questions: [], version: 1 }
            }))
            : [];
        mappedModules[course.id] = [...mappedDatabaseWeeks, ...localOnlyWeeks]
            .sort((a, b) => a.week - b.week);
    });

    courseData.courses = mappedCourses;
    courseData.modules = mappedModules;
    currentCourseId = mappedCourses[0].id;
    refreshCourseSelectOptions();
    if (typeof primeTeacherAssessmentSaveSignatures === 'function') primeTeacherAssessmentSaveSignatures();
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

async function saveLearningWeekToSupabase(courseId, weekData, verifyAfterSave = true) {
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

    if (!verifyAfterSave) return;

    const [slideVerification, vocabularyVerification] = await Promise.all([
        window.supabaseClient
            .from('slides')
            .select('slide_number, content_html')
            .eq('week_id', result.data)
            .order('slide_number'),
        window.supabaseClient
            .from('vocabulary')
            .select('sort_order, term, definition')
            .eq('week_id', result.data)
            .order('sort_order')
    ]);
    if (slideVerification.error) throw slideVerification.error;
    if (vocabularyVerification.error) throw vocabularyVerification.error;
    const expectedSlides = weekData.slides || [];
    const savedSlides = slideVerification.data || [];
    const isExactMatch = savedSlides.length === expectedSlides.length
        && savedSlides.every((slide, index) => slide.slide_number === index + 1 && slide.content_html === expectedSlides[index]);
    if (!isExactMatch) {
        throw new Error(`Slide verification failed: expected ${expectedSlides.length}, database returned ${savedSlides.length}.`);
    }

    const expectedVocabulary = weekData.vocabs || [];
    const savedVocabulary = vocabularyVerification.data || [];
    const vocabularyIsExactMatch = savedVocabulary.length === expectedVocabulary.length
        && savedVocabulary.every((item, index) =>
            item.sort_order === index + 1
            && item.term === (expectedVocabulary[index].word || '')
            && item.definition === (expectedVocabulary[index].def || '')
        );
    if (!vocabularyIsExactMatch) {
        throw new Error(`Vocabulary verification failed: expected ${expectedVocabulary.length}, database returned ${savedVocabulary.length}.`);
    }
}

async function saveCourseLearningContentFast(courseId, weeks, priorityWeekNumber, onProgress) {
    if (!weeks.length) return { weekCount: 0, slideCount: 0 };
    await supabaseLearningSaveChain.catch(() => undefined);

    const priorityWeek = weeks.find(week => week.week === priorityWeekNumber);
    const remainingWeeks = weeks.filter(week => week !== priorityWeek);
    let completed = 0;
    const report = week => {
        completed += 1;
        if (typeof onProgress === 'function') onProgress(week, completed, weeks.length);
    };

    if (priorityWeek) {
        await saveLearningWeekToSupabase(courseId, priorityWeek, false);
        report(priorityWeek);
    }

    const batchSize = 5;
    for (let start = 0; start < remainingWeeks.length; start += batchSize) {
        const batch = remainingWeeks.slice(start, start + batchSize);
        await Promise.all(batch.map(async week => {
            await saveLearningWeekToSupabase(courseId, week, false);
            report(week);
        }));
    }

    return verifyCourseLearningContent(courseId, weeks);
}

async function verifyCourseLearningContent(courseId, expectedWeeks) {
    const weeksResult = await window.supabaseClient
        .from('course_weeks')
        .select('id, week_number, title')
        .eq('course_id', courseId)
        .order('week_number');
    if (weeksResult.error) throw weeksResult.error;

    const savedWeeks = weeksResult.data || [];
    const missingWeeks = expectedWeeks.filter(expected =>
        !savedWeeks.some(saved => saved.week_number === expected.week)
    );
    if (missingWeeks.length) {
        throw new Error(`Course verification failed: Week ${missingWeeks.map(week => week.week).join(', ')} did not reach the database.`);
    }

    const weekIds = savedWeeks.map(week => week.id);
    const slidesResult = weekIds.length
        ? await window.supabaseClient.from('slides').select('week_id, slide_number').in('week_id', weekIds)
        : { data: [], error: null };
    if (slidesResult.error) throw slidesResult.error;

    const mismatches = expectedWeeks.map(expected => {
        const savedWeek = savedWeeks.find(item => item.week_number === expected.week);
        const savedCount = (slidesResult.data || []).filter(slide => slide.week_id === savedWeek?.id).length;
        const expectedCount = (expected.slides || []).length;
        return savedCount === expectedCount ? null : `Week ${expected.week}: expected ${expectedCount}, saved ${savedCount}`;
    }).filter(Boolean);
    if (mismatches.length) {
        throw new Error(`Slide verification failed — ${mismatches.join('; ')}.`);
    }

    return { weekCount: expectedWeeks.length, slideCount: expectedWeeks.reduce((sum, week) => sum + (week.slides || []).length, 0) };
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

    let submissionQuery = window.supabaseClient.from('assessment_submissions').select('*');
    if (existingSubmissionId) {
        submissionQuery = submissionQuery.eq('id', existingSubmissionId);
    } else {
        submissionQuery = submissionQuery
            .eq('assessment_id', assessmentId)
            .eq('student_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1);
    }
    let submissionResult = await submissionQuery.maybeSingle();
    if (submissionResult.error) throw submissionResult.error;

    if (!submissionResult.data && !existingSubmissionId) {
        const started = await window.supabaseClient.rpc('start_assessment', {
            target_assessment_id: assessmentId
        });
        if (started.error) throw started.error;
        submissionResult = await window.supabaseClient.from('assessment_submissions').select('*')
            .eq('assessment_id', assessmentId)
            .eq('student_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
    }
    if (submissionResult.error) throw submissionResult.error;
    const submission = submissionResult.data;
    if (!submission) throw new Error('The assessment attempt could not be created.');

    if (submission.status === 'submitted' || submission.status === 'graded') {
        return loadExistingAssessmentResult(submission);
    }

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

async function loadExistingAssessmentResult(submission) {
    const [gradeResult, reviewResult] = await Promise.all([
        window.supabaseClient.from('submission_grades').select('*').eq('submission_id', submission.id).maybeSingle(),
        window.supabaseClient.rpc('get_submission_review', { target_submission_id: submission.id })
    ]);
    if (gradeResult.error) throw gradeResult.error;
    if (reviewResult.error) throw reviewResult.error;
    return {
        submission,
        grade: gradeResult.data,
        review: reviewResult.data || [],
        alreadySubmitted: true
    };
}

function formatAssessmentSubmissionError(error) {
    const message = String(error?.message || error || 'Unknown submission error');
    if (/student_answers/i.test(message) && /permission denied|row-level security|policy/i.test(message)) {
        return 'Answer saving permission is not configured yet. The administrator must run Supabase update 18, then you can submit again.';
    }
    return message;
}

