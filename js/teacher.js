/* ------------------- Teacher Console Logic (Safe & Fully Guarded) ------------------- */

let wangEditorInstance = null;
let autoSaveTimer = null;
let teacherSlideIndex = 0;
let renderedTeacherSlideIndex = 0;
let isSettingEditorContent = false;
let cloudExamSubmissionCache = [];
const lastSavedLearningSignatures = new Map();
const lastSavedAssessmentSignatures = new Map();

if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function setDocumentImportStatus(message, type = 'normal') {
    const status = document.getElementById('document-import-status');
    if (!status) return;
    status.innerText = message;
    status.className = `text-[11px] min-w-[110px] ${
        type === 'error' ? 'text-rose-400' : type === 'success' ? 'text-emerald-400' : 'text-blue-300'
    }`;
}

function escapeImportedText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeHtmlAttribute(value) {
    return escapeImportedText(value).replace(/`/g, '&#096;');
}

function setStructuredImportStatus(kind, message, type = 'normal') {
    const status = document.getElementById(`${kind}-import-status`);
    if (!status) return;
    status.innerText = message;
    status.className = `text-[11px] ${type === 'error' ? 'text-rose-400' : type === 'success' ? 'text-emerald-400' : 'text-blue-300'}`;
}

async function extractStructuredDocument(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (extension === 'docx') {
        if (!window.mammoth) throw new Error('Word import component failed to load.');
        const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        const doc = new DOMParser().parseFromString(result.value || '', 'text/html');
        const lines = Array.from(doc.querySelectorAll('p, li, h1, h2, h3, td'))
            .map(node => (node.textContent || '').trim()).filter(Boolean);
        const tables = Array.from(doc.querySelectorAll('table')).map(table =>
            Array.from(table.querySelectorAll('tr')).map(row =>
                Array.from(row.querySelectorAll('th, td')).map(cell => (cell.textContent || '').trim())
            ).filter(row => row.some(Boolean))
        );
        return { lines, tables };
    }

    if (extension === 'pdf') {
        if (!window.pdfjsLib) throw new Error('PDF import component failed to load.');
        const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const lines = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            const grouped = [];
            content.items.forEach(item => {
                const text = (item.str || '').trim();
                if (!text) return;
                const y = Math.round(item.transform ? item.transform[5] : 0);
                let line = grouped.find(entry => Math.abs(entry.y - y) <= 2);
                if (!line) {
                    line = { y, parts: [] };
                    grouped.push(line);
                }
                line.parts.push({ x: item.transform ? item.transform[4] : 0, text });
            });
            grouped.sort((a, b) => b.y - a.y).forEach(line => {
                line.parts.sort((a, b) => a.x - b.x);
                lines.push(line.parts.map(part => part.text).join(' ').trim());
            });
        }
        return { lines: lines.filter(Boolean), tables: [] };
    }

    throw new Error('Please choose a .docx or .pdf file.');
}

function parseVocabularyDocument(content) {
    const items = [];
    const addItem = (word, definition) => {
        const cleanWord = String(word || '').replace(/^[-•\d.、)\s]+/, '').trim();
        const cleanDefinition = String(definition || '').trim();
        if (!cleanWord || !cleanDefinition) return;
        if (/^(word|term|vocabulary|词汇|术语)$/i.test(cleanWord)) return;
        if (!items.some(item => item.word.toLowerCase() === cleanWord.toLowerCase())) {
            items.push({ word: cleanWord, def: cleanDefinition });
        }
    };

    content.tables.forEach(table => table.forEach(row => {
        if (row.length >= 2) addItem(row[0], row.slice(1).join(' — '));
    }));

    const unusedLines = [];
    content.lines.forEach(line => {
        if (/^(core\s+)?(academic\s+)?vocabulary|词汇表|核心词汇/i.test(line)) return;
        const match = line.match(/^(.{1,80}?)(?:\t|\s+[—–-]\s+|[:：])\s*(.+)$/);
        if (match) addItem(match[1], match[2]);
        else unusedLines.push(line);
    });

    if (!items.length) {
        for (let i = 0; i + 1 < unusedLines.length; i += 2) addItem(unusedLines[i], unusedLines[i + 1]);
    }
    return items;
}

function parseQuizDocument(content) {
    const quizzes = [];
    let current = null;
    let readingExplanation = false;

    const finishQuestion = () => {
        if (!current || !current.question) return;
        current.type = current.options.length ? 'choice' : 'essay';
        current.answer = current.answer || (current.type === 'choice' ? 'A' : '详见参考答案');
        current.explanation = current.explanation || '';
        current.id = `q_import_${Date.now()}_${quizzes.length}`;
        current.image = '';
        quizzes.push(current);
        current = null;
        readingExplanation = false;
    };

    content.lines.forEach(rawLine => {
        const line = rawLine.replace(/^\s*[•·]\s*/, '').trim();
        if (!line || /^(quiz|questions?|练习题|题库|答案与解析)$/i.test(line)) return;

        const questionMatch = line.match(/^(?:question\s*)?(\d+)\s*[.、):：]\s*(.+)$/i);
        const optionMatch = line.match(/^([A-H])\s*[.、):：]\s*(.+)$/i);
        const answerMatch = line.match(/^(?:correct\s*answer|answer|正确答案|答案)\s*[:：]?\s*([A-H]|.+)$/i);
        const explanationMatch = line.match(/^(?:explanation|analysis|解析|答案解析|参考答案|standard solution)\s*[:：]?\s*(.*)$/i);

        if (questionMatch && !optionMatch) {
            finishQuestion();
            current = { question: `${questionMatch[1]}. ${questionMatch[2]}`, options: [], answer: '', explanation: '' };
            return;
        }
        if (!current && /[?？]$/.test(line)) {
            current = { question: line, options: [], answer: '', explanation: '' };
            return;
        }
        if (!current) return;
        if (optionMatch) {
            current.options.push(`${optionMatch[1].toUpperCase()}. ${optionMatch[2]}`);
            readingExplanation = false;
        } else if (answerMatch) {
            current.answer = answerMatch[1].trim().toUpperCase();
            readingExplanation = false;
        } else if (explanationMatch) {
            current.explanation = explanationMatch[1].trim();
            readingExplanation = true;
        } else if (readingExplanation) {
            current.explanation += `${current.explanation ? ' ' : ''}${line}`;
        } else if (!current.options.length) {
            const isSubQuestion = /^(?:\(\d+\)|（\d+）|\d+\))\s*/.test(line);
            current.question += `${isSubQuestion ? '\n' : ' '}${line}`;
        }
    });
    finishQuestion();
    return quizzes;
}

async function importVocabularyDocument(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    setStructuredImportStatus('vocab', 'Reading...');
    try {
        const items = parseVocabularyDocument(await extractStructuredDocument(file));
        if (!items.length) throw new Error('No vocabulary pairs were recognised. Use “term: definition” or a two-column table.');
        const weekData = getCurrentTeacherWeek();
        weekData.vocabs = items;
        renderVocabEditor(items);
        await saveTeacherEdits(false);
        await uploadTeacherMaterial(file, 'vocabulary');
        setStructuredImportStatus('vocab', `${items.length} terms imported and saved online`, 'success');
    } catch (error) {
        setStructuredImportStatus('vocab', 'Import failed', 'error');
        alert(`Vocabulary import failed: ${error.message}`);
    } finally {
        input.value = '';
    }
}

async function importQuizDocument(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    setStructuredImportStatus('quiz', 'Reading...');
    try {
        const quizzes = parseQuizDocument(await extractStructuredDocument(file));
        if (!quizzes.length) throw new Error('No questions were recognised. Number questions and label choices A, B, C, D.');
        const weekData = getCurrentTeacherWeek();
        weekData.quizzes = quizzes;
        renderQuizEditor(quizzes);
        await saveTeacherEdits(false);
        await uploadTeacherMaterial(file, 'practice-quiz');
        setStructuredImportStatus('quiz', `${quizzes.length} questions imported; source file saved online`, 'success');
    } catch (error) {
        setStructuredImportStatus('quiz', 'Import failed', 'error');
        alert(`Quiz import failed: ${error.message}`);
    } finally {
        input.value = '';
    }
}

function getCurrentTeacherWeek() {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return null;
    const weeks = courseData.modules[courseSelect.value] || [];
    return weeks.find(w => w.week === (parseInt(weekSelect.value) || 1)) || null;
}

function applyImportedSlides(slides) {
    const weekData = getCurrentTeacherWeek();
    if (!weekData || !slides.length) throw new Error('Please select a course and week first.');

    saveCurrentSlideContentToMemory();
    const originalSlides = [...weekData.slides];
    weekData.slides.splice(teacherSlideIndex, 1, ...slides);
    try {
        const serializedData = JSON.stringify(courseData);
        if (serializedData.length > 4.5 * 1024 * 1024) {
            throw new Error('This document is too large for page-image storage. Please select “Editable text” and import it again.');
        }
        localStorage.setItem('shu_course_data', serializedData);
    } catch (error) {
        weekData.slides = originalSlides;
        if (error && error.message && error.message.includes('too large')) throw error;
        throw new Error('The browser does not have enough storage for this document. Please import it as editable text.');
    }
    renderTeacherSlideTabs(weekData.slides.length);
    renderCurrentTeacherSlideContent();
}

function pdfTextItemsToHtml(items, pageNumber) {
    const lines = [];
    items.forEach(item => {
        const text = (item.str || '').trim();
        if (!text) return;
        const y = Math.round(item.transform ? item.transform[5] : 0);
        let line = lines.find(existing => Math.abs(existing.y - y) <= 2);
        if (!line) {
            line = { y, parts: [] };
            lines.push(line);
        }
        line.parts.push({ x: item.transform ? item.transform[4] : 0, text });
    });

    lines.sort((a, b) => b.y - a.y);
    const paragraphs = lines.map(line => {
        line.parts.sort((a, b) => a.x - b.x);
        return `<p>${escapeImportedText(line.parts.map(part => part.text).join(' '))}</p>`;
    }).join('');
    return `<h2>Page ${pageNumber}</h2>${paragraphs || '<p>[No editable text was found on this page.]</p>'}`;
}

function splitImportedWordIntoSlides(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');
    const blocks = Array.from(doc.body.children);
    if (!blocks.length) return [html];

    const slides = [];
    let currentBlocks = [];
    let currentHeight = 0;
    const maxEstimatedHeight = 520;

    const finishSlide = () => {
        if (!currentBlocks.length) return;
        slides.push(currentBlocks.map(block => block.outerHTML).join(''));
        currentBlocks = [];
        currentHeight = 0;
    };

    const estimateHeight = block => {
        const tag = block.tagName.toLowerCase();
        const textLength = (block.textContent || '').trim().length;
        if (block.querySelector('img') || tag === 'img') return maxEstimatedHeight;
        if (tag === 'table') return Math.min(maxEstimatedHeight, 55 + block.querySelectorAll('tr').length * 34);
        if (tag === 'ul' || tag === 'ol') return 28 + block.querySelectorAll('li').length * 32;
        if (/^h[1-3]$/.test(tag)) return 55;
        return 28 + Math.max(1, Math.ceil(textLength / 80)) * 20;
    };

    blocks.forEach(block => {
        const height = estimateHeight(block);
        const startsNewSection = /^H[1-2]$/.test(block.tagName);
        if (startsNewSection && currentHeight > maxEstimatedHeight * 0.65) finishSlide();
        if (currentBlocks.length && currentHeight + height > maxEstimatedHeight) finishSlide();
        currentBlocks.push(block);
        currentHeight += height;
        if (height >= maxEstimatedHeight) finishSlide();
    });

    finishSlide();
    return slides.length ? slides : [html];
}

async function importWordDocument(file) {
    if (!window.mammoth) throw new Error('Word import component failed to load. Please check the network and refresh.');
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.convertToHtml(
        { arrayBuffer },
        {
            convertImage: window.mammoth.images.imgElement(image => image.read('base64').then(data => ({
                src: `data:${image.contentType};base64,${data}`
            })))
        }
    );
    const html = result.value && result.value.trim();
    if (!html) throw new Error('No text or images were found in this Word document.');
    const slides = splitImportedWordIntoSlides(html);
    applyImportedSlides(slides);
    return result.messages && result.messages.length
        ? `Imported as ${slides.length} slide(s), with ${result.messages.length} formatting notice(s)`
        : `Word imported as ${slides.length} slide(s)`;
}

async function importPdfDocument(file, mode) {
    if (!window.pdfjsLib) throw new Error('PDF import component failed to load. Please check the network and refresh.');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    const slides = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setDocumentImportStatus(`Processing ${pageNumber} / ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNumber);
        if (mode === 'image') {
            const baseViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(1.75, 1000 / baseViewport.width);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(viewport.width);
            canvas.height = Math.round(viewport.height);
            const context = canvas.getContext('2d', { alpha: false });
            await page.render({ canvasContext: context, viewport }).promise;
            const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
            slides.push(`<p style="text-align:center"><img src="${imageUrl}" alt="PDF page ${pageNumber}"></p>`);
        } else {
            const textContent = await page.getTextContent();
            slides.push(pdfTextItemsToHtml(textContent.items, pageNumber));
        }
    }

    applyImportedSlides(slides);
    return `PDF imported: ${pdf.numPages} page(s)`;
}

async function importTeachingDocument(input) {
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const modeSelect = document.getElementById('document-import-mode');
    const mode = modeSelect ? modeSelect.value : 'text';
    setDocumentImportStatus('Reading document...');

    try {
        let message;
        if (extension === 'docx') {
            message = await importWordDocument(file);
        } else if (extension === 'pdf') {
            message = await importPdfDocument(file, mode);
        } else {
            throw new Error('Please choose a .docx or .pdf file.');
        }
        await saveTeacherEdits(false);
        await uploadTeacherMaterial(file, 'lecture');
        setDocumentImportStatus(`${message}; source saved online`, 'success');
    } catch (error) {
        console.error('Document import failed:', error);
        setDocumentImportStatus(error.message || 'Import failed', 'error');
        alert(`Document import failed: ${error.message || 'Unknown error'}`);
    } finally {
        input.value = '';
    }
}

function initRichTextEditor() {
    if (wangEditorInstance) return;

    try {
        if (!window.wangEditor) return;
        const { createEditor, createToolbar } = window.wangEditor;

        const editorConfig = {
            placeholder: 'Enter current slide content here... (Supports headings, tables, bullet points, and images)',
            onChange(editor) {
                if (isSettingEditorContent) return;
                saveCurrentSlideContentToMemory(editor);
                triggerAutoSaveDebounced();
            },
            MENU_CONF: {
                uploadImage: {
                    base64LimitSize: 10 * 1024 * 1024
                },
                fontFamily: {
                    fontFamilyList: [
                        'Arial',
                        'Times New Roman',
                        'Calibri',
                        'Georgia',
                        'Verdana',
                        '微软雅黑',
                        '宋体',
                        '新宋体',
                        '仿宋',
                        '楷体',
                        '黑体',
                        '等线',
                        '苹方',
                        'PingFang SC',
                        '思源黑体',
                        'Source Han Sans SC',
                        '思源宋体',
                        'Source Han Serif SC',
                        '华文宋体',
                        '华文黑体',
                        '华文楷体',
                        '华文仿宋',
                        '微软正黑体'
                    ]
                }
            }
        };

        wangEditorInstance = createEditor({
            selector: '#wang-editor-container',
            html: '<h2>Slide Title</h2><p>Type slide lecture content here...</p>',
            config: editorConfig,
            mode: 'simple'
        });

        const toolbarConfig = {
            toolbarKeys: [
                'headerSelect',
                'bold',
                'underline',
                'italic',
                'color',
                'fontSize',
                'fontFamily',
                '|',
                'insertTable',
                'uploadImage',
                'bulletedList',
                'numberedList',
                'justifyLeft',
                'justifyCenter',
                'undo',
                'redo'
            ]
        };

        createToolbar({
            editor: wangEditorInstance,
            selector: '#wang-toolbar-container',
            config: toolbarConfig,
            mode: 'simple'
        });
    } catch(e) {
        console.warn('WangEditor load delayed or prevented:', e);
    }
}

function loadCourseToEditor() {
    initRichTextEditor();

    const selectEl = document.getElementById('editor-course-select');
    if (!selectEl) return;
    const courseId = selectEl.value;
    const weekSelect = document.getElementById('editor-week-select');
    
    if (!courseData.modules[courseId] || courseData.modules[courseId].length === 0) {
        courseData.modules[courseId] = [{
            week: 1,
            title: 'Week 1: Introduction & Foundations',
            slides: ['<h2>1. Module Overview</h2><p>Type page 1 lecture slide content here...</p>'],
            vocabs: [{ word: 'Concept', def: 'Abstract idea or foundation.' }],
            quizzes: [{ id: 'q1', type: 'choice', question: '1. Sample Question Title?', image: '', options: ['A. Option A', 'B. Option B'], answer: 'A', explanation: 'Sample explanation text.' }],
            exam: { isOpen: false, durationMinutes: 60, questions: [], version: 1 }
        }];
    }

    const weeks = courseData.modules[courseId];
    if (weekSelect) {
        weekSelect.innerHTML = weeks.map(w => `<option value="${w.week}">Week ${w.week}: ${w.title}</option>`).join('');
    }
    
    teacherSlideIndex = 0;
    loadWeekToEditor();
}

function loadWeekToEditor() {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum) || courseData.modules[courseId][0];

    const titleInput = document.getElementById('edit-week-title');
    if (titleInput) titleInput.value = weekData.title || '';
    
    if (!weekData.slides || weekData.slides.length === 0) {
        weekData.slides = ['<p>Type slide content for Page 1...</p>'];
    }

    if (teacherSlideIndex >= weekData.slides.length) {
        teacherSlideIndex = weekData.slides.length - 1;
    }

    renderTeacherSlideTabs(weekData.slides.length);
    renderCurrentTeacherSlideContent();

    renderVocabEditor(weekData.vocabs || []);
    renderQuizEditor(weekData.quizzes || []);
    if (!weekData.exam) weekData.exam = { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
    renderExamEditor(weekData.exam);
    renderExamSubmissions();
    renderStudentProgressDashboard();
}

let teacherProgressLoadToken = 0;

function getLatestSubmissionForStudent(submissions, studentId, assessmentId) {
    if (!assessmentId) return null;
    return submissions
        .filter(item => item.student_id === studentId && item.assessment_id === assessmentId)
        .sort((a, b) => new Date(b.submitted_at || b.started_at || b.created_at || 0) - new Date(a.submitted_at || a.started_at || a.created_at || 0))[0] || null;
}

function getProgressStatusMeta(submission, grade) {
    if (!submission) return { label: 'Not started', color: 'text-slate-400', dot: 'bg-slate-600' };
    if (submission.status === 'graded') {
        const score = grade?.final_score ?? grade?.objective_score;
        return { label: score == null ? 'Graded' : `Graded · ${score} pts`, color: 'text-emerald-300', dot: 'bg-emerald-400' };
    }
    if (submission.status === 'submitted') {
        const score = grade?.objective_score;
        return { label: score == null ? 'Submitted' : `Submitted · ${score} pts`, color: 'text-amber-300', dot: 'bg-amber-400' };
    }
    return { label: 'In progress', color: 'text-blue-300', dot: 'bg-blue-400' };
}

function renderProgressStatusCell(submission, grade) {
    const meta = getProgressStatusMeta(submission, grade);
    return `<span class="inline-flex items-center gap-2 ${meta.color}"><span class="w-2 h-2 rounded-full ${meta.dot}"></span>${meta.label}</span>`;
}

function formatProgressDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function renderStudentProgressDashboard() {
    const summary = document.getElementById('student-progress-summary');
    const list = document.getElementById('student-progress-list');
    if (!summary || !list) return;

    if (!window.supabaseClient || currentUser?.role !== 'teacher') {
        summary.innerHTML = '';
        list.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-slate-500">Teacher login is required.</td></tr>';
        return;
    }

    const courseId = document.getElementById('editor-course-select')?.value;
    const weekData = getCurrentTeacherWeek();
    if (!courseId || !weekData?._supabaseId) {
        summary.innerHTML = '';
        list.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-slate-500">Select an online course and week to view progress.</td></tr>';
        return;
    }

    const loadToken = ++teacherProgressLoadToken;
    summary.innerHTML = Array.from({ length: 4 }, () => '<div class="h-20 rounded-xl bg-slate-900 border border-slate-800 animate-pulse"></div>').join('');
    list.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading student progress...</td></tr>';

    try {
        const [enrollmentResult, assessmentResult] = await Promise.all([
            window.supabaseClient.from('course_enrollments').select('student_id').eq('course_id', courseId),
            window.supabaseClient.from('assessments').select('id, kind').eq('week_id', weekData._supabaseId)
        ]);
        if (enrollmentResult.error) throw enrollmentResult.error;
        if (assessmentResult.error) throw assessmentResult.error;
        if (loadToken !== teacherProgressLoadToken) return;

        const studentIds = [...new Set((enrollmentResult.data || []).map(item => item.student_id))];
        const assessments = assessmentResult.data || [];
        const assessmentIds = assessments.map(item => item.id);
        const practiceId = assessments.find(item => item.kind === 'practice')?.id || null;
        const examId = assessments.find(item => item.kind === 'exam')?.id || null;

        const profilesResult = studentIds.length
            ? await window.supabaseClient.from('profiles').select('id, full_name').in('id', studentIds)
            : { data: [], error: null };
        if (profilesResult.error) throw profilesResult.error;

        const submissionResult = assessmentIds.length
            ? await window.supabaseClient.from('assessment_submissions').select('*').in('assessment_id', assessmentIds)
            : { data: [], error: null };
        if (submissionResult.error) throw submissionResult.error;
        const submissions = submissionResult.data || [];
        const submissionIds = submissions.map(item => item.id);
        const gradesResult = submissionIds.length
            ? await window.supabaseClient.from('submission_grades').select('*').in('submission_id', submissionIds)
            : { data: [], error: null };
        if (gradesResult.error) throw gradesResult.error;
        if (loadToken !== teacherProgressLoadToken) return;

        const profiles = profilesResult.data || [];
        const grades = gradesResult.data || [];
        const rows = studentIds.map((studentId, index) => {
            const practice = getLatestSubmissionForStudent(submissions, studentId, practiceId);
            const exam = getLatestSubmissionForStudent(submissions, studentId, examId);
            const practiceGrade = grades.find(item => item.submission_id === practice?.id);
            const examGrade = grades.find(item => item.submission_id === exam?.id);
            const latest = [practice, exam].filter(Boolean).sort((a, b) => new Date(b.submitted_at || b.started_at || b.created_at || 0) - new Date(a.submitted_at || a.started_at || a.created_at || 0))[0];
            return {
                studentId,
                name: profiles.find(item => item.id === studentId)?.full_name || `Student ${index + 1}`,
                practice,
                exam,
                practiceGrade,
                examGrade,
                latest
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const startedStudents = rows.filter(row => row.practice || row.exam).length;
        const submittedStudents = rows.filter(row => ['submitted', 'graded'].includes(row.practice?.status) || ['submitted', 'graded'].includes(row.exam?.status)).length;
        const pendingGrades = submissions.filter(item => item.status === 'submitted').length;
        const summaryCards = [
            ['Enrolled Students', rows.length, 'fa-users', 'text-cyan-300'],
            ['Started', startedStudents, 'fa-pen-to-square', 'text-blue-300'],
            ['Submitted', submittedStudents, 'fa-circle-check', 'text-emerald-300'],
            ['Awaiting Grading', pendingGrades, 'fa-hourglass-half', 'text-amber-300']
        ];
        summary.innerHTML = summaryCards.map(([label, value, icon, color]) => `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4"><div class="flex items-center justify-between"><span class="text-[11px] text-slate-400">${label}</span><i class="fa-solid ${icon} ${color}"></i></div><div class="text-2xl font-extrabold text-white mt-2">${value}</div></div>`).join('');

        if (!rows.length) {
            list.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-slate-500">No students are enrolled in this course.</td></tr>';
            return;
        }

        list.innerHTML = rows.map(row => {
            const canReviewExam = row.exam && ['submitted', 'graded'].includes(row.exam.status);
            return `<tr class="hover:bg-slate-900/70 transition">
                <td class="px-4 py-3"><div class="font-bold text-white">${escapeImportedText(row.name)}</div><div class="text-[10px] text-slate-500 mt-0.5">${row.studentId.slice(0, 8)}</div></td>
                <td class="px-4 py-3">${renderProgressStatusCell(row.practice, row.practiceGrade)}</td>
                <td class="px-4 py-3">${renderProgressStatusCell(row.exam, row.examGrade)}</td>
                <td class="px-4 py-3 text-slate-400">${formatProgressDate(row.latest?.submitted_at || row.latest?.started_at || row.latest?.created_at)}</td>
                <td class="px-4 py-3 text-right">${canReviewExam ? `<button onclick="focusStudentExamSubmission('${row.studentId}')" class="bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 px-3 py-1.5 rounded-lg font-semibold">Review Exam</button>` : '<span class="text-slate-600">—</span>'}</td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Unable to load student progress:', error);
        summary.innerHTML = '';
        list.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-rose-400">Unable to load progress: ${escapeImportedText(error.message)}</td></tr>`;
    }
}

async function focusStudentExamSubmission(studentId) {
    await renderExamSubmissions();
    const target = document.querySelector(`[data-student-id="${studentId}"]`);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('ring-2', 'ring-violet-400');
        setTimeout(() => target.classList.remove('ring-2', 'ring-violet-400'), 2500);
    }
}

function renderTeacherSlideTabs(totalSlides) {
    const tabsContainer = document.getElementById('teacher-slide-tabs');
    if (!tabsContainer) return;

    let tabsHtml = '';
    for (let i = 0; i < totalSlides; i++) {
        const isActive = i === teacherSlideIndex;
        tabsHtml += `
            <button onclick="switchTeacherSlide(${i})" class="px-3 py-1 text-xs rounded-lg font-mono font-bold transition ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }">
                Slide ${i + 1}
            </button>
        `;
    }
    tabsContainer.innerHTML = tabsHtml;

    const indicator = document.getElementById('teacher-slide-indicator');
    const label = document.getElementById('current-slide-label');
    if (indicator) indicator.innerText = `Page ${teacherSlideIndex + 1} / ${totalSlides}`;
    if (label) label.innerText = `Slide ${teacherSlideIndex + 1}`;
}

function renderCurrentTeacherSlideContent() {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (wangEditorInstance && weekData && weekData.slides) {
        renderedTeacherSlideIndex = teacherSlideIndex;
        isSettingEditorContent = true;
        wangEditorInstance.setHtml(weekData.slides[teacherSlideIndex] || '<p>Type slide content...</p>');
        setTimeout(() => {
            isSettingEditorContent = false;
        }, 0);
    }
}

function switchTeacherSlide(index) {
    saveCurrentSlideContentToMemory();
    teacherSlideIndex = index;
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (weekData) {
        renderTeacherSlideTabs(weekData.slides.length);
        renderCurrentTeacherSlideContent();
    }
}

function prevTeacherSlide() {
    if (teacherSlideIndex > 0) {
        switchTeacherSlide(teacherSlideIndex - 1);
    }
}

function nextTeacherSlide() {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (weekData && teacherSlideIndex < weekData.slides.length - 1) {
        switchTeacherSlide(teacherSlideIndex + 1);
    }
}

function addNewSlide() {
    saveCurrentSlideContentToMemory();
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (weekData) {
        weekData.slides.push(`<h2>Slide ${weekData.slides.length + 1}</h2><p>Type new slide content...</p>`);
        teacherSlideIndex = weekData.slides.length - 1;
        loadWeekToEditor();
        autoSaveTeacherEdits();
    }
}

function deleteCurrentSlide() {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (weekData && weekData.slides.length > 1) {
        weekData.slides.splice(teacherSlideIndex, 1);
        if (teacherSlideIndex >= weekData.slides.length) {
            teacherSlideIndex = weekData.slides.length - 1;
        }
        loadWeekToEditor();
        autoSaveTeacherEdits();
    } else {
        alert('Warning: At least one PPT slide must be retained!');
    }
}

function saveCurrentSlideContentToMemory(editor = wangEditorInstance) {
    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;
    const weekData = courseData.modules[courseId].find(w => w.week === weekNum);

    if (weekData && editor && !isSettingEditorContent) {
        if (!weekData.slides) weekData.slides = [];
        weekData.slides[renderedTeacherSlideIndex] = editor.getHtml();
    }
}

function triggerAutoSaveDebounced() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    
    const statusText = document.getElementById('autosave-text');
    if (statusText) statusText.innerText = 'Unsaved changes...';

    autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        if (statusText) statusText.innerText = 'Saving changes...';
        saveTeacherEdits(false);
    }, 1800);
}

function autoSaveTeacherEdits() {
    triggerAutoSaveDebounced();
}

function renderVocabEditor(vocabs) {
    const container = document.getElementById('editor-vocab-list');
    if (!container) return;
    container.innerHTML = vocabs.map((v, i) => `
        <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 relative">
            <button onclick="removeVocabItem(${i})" class="absolute top-2.5 right-2.5 text-rose-400 hover:text-rose-300 text-xs">
                <i class="fa-solid fa-trash"></i>
            </button>
            <input type="text" value="${escapeHtmlAttribute(v.word)}" oninput="autoSaveTeacherEdits()" placeholder="English Term" class="vocab-word-input w-[85%] bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:border-blue-500 focus:outline-none">
            <input type="text" value="${escapeHtmlAttribute(v.def)}" oninput="autoSaveTeacherEdits()" placeholder="Definition & Explanation" class="vocab-def-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:border-blue-500 focus:outline-none">
        </div>
    `).join('');
}

function addVocabItem() {
    const container = document.getElementById('editor-vocab-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 relative";
    div.innerHTML = `
        <button onclick="this.parentElement.remove(); autoSaveTeacherEdits();" class="absolute top-2.5 right-2.5 text-rose-400 hover:text-rose-300 text-xs"><i class="fa-solid fa-trash"></i></button>
        <input type="text" oninput="autoSaveTeacherEdits()" placeholder="English Term" class="vocab-word-input w-[85%] bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs font-bold focus:border-blue-500 focus:outline-none">
        <input type="text" oninput="autoSaveTeacherEdits()" placeholder="Definition & Explanation" class="vocab-def-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 text-xs focus:border-blue-500 focus:outline-none">
    `;
    container.appendChild(div);
    autoSaveTeacherEdits();
}

function removeVocabItem(index) {
    const list = document.getElementById('editor-vocab-list');
    if (list && list.children[index]) {
        list.children[index].remove();
        autoSaveTeacherEdits();
    }
}

function renderQuizEditor(quizzes) {
    const container = document.getElementById('editor-quiz-list');
    if (!container) return;
    container.innerHTML = quizzes.map((q, i) => {
        const type = q.type || 'choice';
        const isChoice = type === 'choice';

        return `
            <div class="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 relative text-xs quiz-editor-card">
                <button onclick="removeQuizItem(${i})" class="absolute top-3 right-3 text-rose-400 hover:text-rose-300">
                    <i class="fa-solid fa-trash"></i>
                </button>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[11px] text-slate-400 font-semibold mb-1">Question Type</label>
                        <select onchange="handleQuizTypeChange(this, ${i})" class="quiz-type-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold focus:border-blue-500 focus:outline-none">
                            <option value="choice" ${isChoice ? 'selected' : ''}>Multiple Choice</option>
                            <option value="essay" ${!isChoice ? 'selected' : ''}>Essay (Photo Submission)</option>
                        </select>
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block text-[11px] text-slate-400 font-semibold mb-1">Diagram/Image URL (e.g. Curves, Functions)</label>
                        <div class="flex space-x-2">
                            <input type="text" value="${escapeHtmlAttribute(q.image || '')}" oninput="autoSaveTeacherEdits()" placeholder="Paste image URL (https://...) or leave blank" class="quiz-img-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:border-blue-500 focus:outline-none">
                            <label class="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer flex items-center shrink-0">
                                <i class="fa-solid fa-image mr-1"></i>Upload
                                <input type="file" accept="image/*" onchange="handleQuizImgUpload(this, ${i})" class="hidden">
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] text-slate-400 font-semibold mb-1">Question Description</label>
                    <textarea rows="4" oninput="autoSaveTeacherEdits()" placeholder="Enter the main question and put each sub-question on a new line..." class="quiz-q-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-medium leading-relaxed focus:border-blue-500 focus:outline-none resize-y">${escapeImportedText(q.question)}</textarea>
                </div>

                <div class="quiz-choice-section space-y-2 ${isChoice ? '' : 'hidden'}">
                    <label class="block text-[11px] text-slate-400 font-semibold">Options (Separated by semicolon)</label>
                    <input type="text" value="${escapeHtmlAttribute(q.options ? q.options.join('; ') : '')}" oninput="autoSaveTeacherEdits()" placeholder="A. Option 1; B. Option 2; C. Option 3; D. Option 4" class="quiz-opts-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:border-blue-500 focus:outline-none">
                    <div>
                        <label class="block text-[11px] text-slate-400 font-semibold mb-1">Correct Answer</label>
                        <input type="text" value="${escapeHtmlAttribute(q.answer)}" oninput="autoSaveTeacherEdits()" placeholder="e.g. B" class="quiz-ans-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold uppercase focus:border-blue-500 focus:outline-none">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] text-slate-400 font-semibold mb-1">${isChoice ? 'Explanation' : 'Standard Solution & Rubric'}</label>
                    <textarea rows="3" oninput="autoSaveTeacherEdits()" placeholder="${isChoice ? 'Explanation details...' : 'Standard step-by-step solution points...'}" class="quiz-exp-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 leading-relaxed focus:border-blue-500 focus:outline-none resize-y">${escapeImportedText(q.explanation)}</textarea>
                </div>
            </div>
        `;
    }).join('');
}

function handleQuizTypeChange(selectEl, index) {
    const card = selectEl.closest('.quiz-editor-card');
    if (!card) return;
    const choiceSection = card.querySelector('.quiz-choice-section');
    if (choiceSection) {
        if (selectEl.value === 'choice') {
            choiceSection.classList.remove('hidden');
        } else {
            choiceSection.classList.add('hidden');
        }
    }
    autoSaveTeacherEdits();
}

function handleQuizImgUpload(fileInput, index) {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const card = fileInput.closest('.quiz-editor-card');
            if (card) {
                const imgInput = card.querySelector('.quiz-img-input');
                if (imgInput) imgInput.value = e.target.result;
            }
            autoSaveTeacherEdits();
        };
        reader.readAsDataURL(file);
    }
}

function addQuizItem() {
    const container = document.getElementById('editor-quiz-list');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 relative text-xs quiz-editor-card";
    div.innerHTML = `
        <button onclick="this.parentElement.remove(); autoSaveTeacherEdits();" class="absolute top-3 right-3 text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
                <label class="block text-[11px] text-slate-400 font-semibold mb-1">Question Type</label>
                <select onchange="handleQuizTypeChange(this)" class="quiz-type-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold focus:border-blue-500 focus:outline-none">
                    <option value="choice">Multiple Choice</option>
                    <option value="essay">Essay (Photo Submission)</option>
                </select>
            </div>
            <div class="sm:col-span-2">
                <label class="block text-[11px] text-slate-400 font-semibold mb-1">Diagram/Image URL (e.g. Curves, Functions)</label>
                <div class="flex space-x-2">
                    <input type="text" oninput="autoSaveTeacherEdits()" placeholder="Paste image URL (https://...) or leave blank" class="quiz-img-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:border-blue-500 focus:outline-none">
                    <label class="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 px-3 py-1.5 rounded-lg cursor-pointer flex items-center shrink-0">
                        <i class="fa-solid fa-image mr-1"></i>Upload
                        <input type="file" accept="image/*" onchange="handleQuizImgUpload(this)" class="hidden">
                    </label>
                </div>
            </div>
        </div>

        <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-1">Question Description</label>
            <textarea rows="4" oninput="autoSaveTeacherEdits()" placeholder="Enter the main question and put each sub-question on a new line..." class="quiz-q-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white font-medium leading-relaxed focus:border-blue-500 focus:outline-none resize-y"></textarea>
        </div>

        <div class="quiz-choice-section space-y-2">
            <label class="block text-[11px] text-slate-400 font-semibold">Options (Separated by semicolon)</label>
            <input type="text" oninput="autoSaveTeacherEdits()" placeholder="A. Option 1; B. Option 2; C. Option 3; D. Option 4" class="quiz-opts-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:border-blue-500 focus:outline-none">
            <div>
                <label class="block text-[11px] text-slate-400 font-semibold mb-1">Correct Answer</label>
                <input type="text" oninput="autoSaveTeacherEdits()" placeholder="A" class="quiz-ans-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold uppercase focus:border-blue-500 focus:outline-none">
            </div>
        </div>

        <div>
            <label class="block text-[11px] text-slate-400 font-semibold mb-1">Explanation / Standard Solution</label>
            <textarea rows="3" oninput="autoSaveTeacherEdits()" placeholder="Write standard solution steps..." class="quiz-exp-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 leading-relaxed focus:border-blue-500 focus:outline-none resize-y"></textarea>
        </div>
    `;
    container.appendChild(div);
    autoSaveTeacherEdits();
}

function removeQuizItem(index) {
    const list = document.getElementById('editor-quiz-list');
    if (list && list.children[index]) {
        list.children[index].remove();
        autoSaveTeacherEdits();
    }
}

function renderExamEditor(exam) {
    const durationInput = document.getElementById('exam-duration-input');
    if (durationInput) durationInput.value = exam.durationMinutes || 60;
    const toggle = document.getElementById('exam-open-toggle');
    if (toggle) {
        toggle.className = `text-xs text-white px-4 py-1.5 rounded-lg transition font-bold ${exam.isOpen ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`;
        toggle.innerHTML = exam.isOpen
            ? '<i class="fa-solid fa-lock mr-1"></i>Close Exam'
            : '<i class="fa-solid fa-lock-open mr-1"></i>Open Exam';
    }

    const container = document.getElementById('editor-exam-list');
    if (!container) return;
    container.innerHTML = (exam.questions || []).map((q, index) => {
        const isChoice = (q.type || 'choice') === 'choice';
        return `
            <div class="exam-editor-card bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 relative text-xs">
                <button onclick="removeExamQuestion(${index})" class="absolute top-3 right-3 text-rose-400 hover:text-rose-300"><i class="fa-solid fa-trash"></i></button>
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pr-6">
                    <select onchange="handleExamTypeChange(this)" class="exam-type-input bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-violet-300 font-bold focus:outline-none">
                        <option value="choice" ${isChoice ? 'selected' : ''}>Multiple Choice</option>
                        <option value="essay" ${!isChoice ? 'selected' : ''}>Essay</option>
                    </select>
                    <input value="${escapeHtmlAttribute(q.image || '')}" oninput="autoSaveTeacherEdits()" placeholder="Optional image URL" class="exam-img-input sm:col-span-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none">
                    <input type="number" min="0" value="${Number(q.points) || (isChoice ? 1 : 10)}" oninput="autoSaveTeacherEdits()" placeholder="Points" class="exam-points-input bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-violet-300 focus:outline-none">
                </div>
                <textarea rows="4" oninput="autoSaveTeacherEdits()" placeholder="Question — put each sub-question on a new line" class="exam-q-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white leading-relaxed focus:outline-none resize-y">${escapeImportedText(q.question || '')}</textarea>
                <div class="exam-choice-fields space-y-2 ${isChoice ? '' : 'hidden'}">
                    <input value="${escapeHtmlAttribute((q.options || []).join('; '))}" oninput="autoSaveTeacherEdits()" placeholder="A. Option; B. Option; C. Option; D. Option" class="exam-opts-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none">
                    <input value="${escapeHtmlAttribute(q.answer || '')}" oninput="autoSaveTeacherEdits()" placeholder="Correct answer, e.g. A" class="exam-ans-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-300 font-bold focus:outline-none">
                </div>
                <textarea rows="3" oninput="autoSaveTeacherEdits()" placeholder="Detailed explanation / reference solution" class="exam-exp-input w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 leading-relaxed focus:outline-none resize-y">${escapeImportedText(q.explanation || '')}</textarea>
            </div>`;
    }).join('');
}

async function renderExamSubmissions() {
    const container = document.getElementById('exam-submissions-list');
    const courseId = document.getElementById('editor-course-select')?.value;
    const weekNum = parseInt(document.getElementById('editor-week-select')?.value) || 1;
    const exam = getCurrentTeacherWeek()?.exam;
    if (!container || !courseId || !exam) return;
    if (exam._supabaseId && window.supabaseClient && currentUser?.role === 'teacher') {
        try {
            await renderCloudExamSubmissions(container, exam);
        } catch (error) {
            console.error('Unable to load online submissions:', error);
            container.innerHTML = `<div class="text-xs text-rose-400 bg-slate-900 border border-rose-900 rounded-xl p-4">Unable to load online submissions: ${escapeImportedText(error.message)}</div>`;
        }
        return;
    }
    const suffix = `_${courseId}_${weekNum}`;
    const prefix = 'shu_exam_attempt_';
    const submissions = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix) || !key.endsWith(suffix)) continue;
        try {
            const attempt = JSON.parse(localStorage.getItem(key));
            if (attempt?.submitted && attempt.examVersion === (exam.version || 1)) {
                submissions.push({ key, username: key.slice(prefix.length, -suffix.length), attempt });
            }
        } catch (error) { /* Ignore invalid local records. */ }
    }
    if (!submissions.length) {
        container.innerHTML = '<div class="text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl p-4">No submitted examination papers for the current exam round.</div>';
        return;
    }
    container.innerHTML = submissions.map(({ key, username, attempt }, submissionIndex) => {
        const essays = (exam.questions || []).filter(q => (q.type || 'choice') === 'essay');
        return `<div data-student-id="${record.submission.student_id}" class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 transition">
            <div class="flex justify-between items-center"><div><span class="font-bold text-white">${escapeImportedText(username)}</span><span class="text-[11px] text-slate-400 ml-2">Objective: ${attempt.autoScore || 0} / ${attempt.autoMax || 0}</span></div><span class="text-[11px] ${attempt.gradingStatus === 'graded' ? 'text-emerald-400' : 'text-amber-300'}">${attempt.gradingStatus === 'graded' ? 'Graded' : 'Awaiting grading'}</span></div>
            ${essays.map((q, essayIndex) => `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                <div class="text-xs font-semibold text-slate-200">${escapeImportedText(q.question)}</div>
                ${attempt.essayImages?.[q.id] ? `<a href="${attempt.essayImages[q.id]}" target="_blank"><img src="${attempt.essayImages[q.id]}" class="max-h-72 rounded-lg border border-slate-700 object-contain bg-white" alt="Student written solution"></a>` : '<div class="text-xs text-rose-400">No solution photo</div>'}
                <div class="flex items-center gap-2"><label class="text-[11px] text-slate-400">Score</label><input id="essay-grade-${submissionIndex}-${essayIndex}" type="number" min="0" max="${Number(q.points) || 10}" value="${attempt.essayGrades?.[q.id] ?? ''}" class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"><span class="text-[11px] text-slate-500">/ ${Number(q.points) || 10}</span></div>
            </div>`).join('')}
            <textarea id="teacher-comment-${submissionIndex}" placeholder="Overall teacher feedback" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200">${escapeImportedText(attempt.teacherComment || '')}</textarea>
            <button onclick="gradeExamSubmission('${encodeURIComponent(key)}', ${submissionIndex})" class="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-xs font-bold">Save Grade & Feedback</button>
        </div>`;
    }).join('');
}

async function renderCloudExamSubmissions(container, exam) {
    const submissionResult = await window.supabaseClient.from('assessment_submissions').select('*')
        .eq('assessment_id', exam._supabaseId).in('status', ['submitted', 'graded']).order('submitted_at', { ascending: false });
    if (submissionResult.error) throw submissionResult.error;
    const submissions = submissionResult.data || [];
    if (!submissions.length) {
        container.innerHTML = '<div class="text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-xl p-4">No submitted examination papers.</div>';
        return;
    }
    const submissionIds = submissions.map(item => item.id);
    const studentIds = [...new Set(submissions.map(item => item.student_id))];
    const [answersResult, gradesResult, profilesResult] = await Promise.all([
        window.supabaseClient.from('student_answers').select('*').in('submission_id', submissionIds),
        window.supabaseClient.from('submission_grades').select('*').in('submission_id', submissionIds),
        window.supabaseClient.from('profiles').select('id, full_name').in('id', studentIds)
    ]);
    if (answersResult.error) throw answersResult.error;
    if (gradesResult.error) throw gradesResult.error;
    const answers = answersResult.data || [];
    const grades = gradesResult.data || [];
    const profiles = profilesResult.data || [];
    cloudExamSubmissionCache = [];

    for (const submission of submissions) {
        const submissionAnswers = answers.filter(item => item.submission_id === submission.id);
        const signedUrls = {};
        for (const answer of submissionAnswers.filter(item => item.upload_path)) {
            const signed = await window.supabaseClient.storage.from('student-submissions').createSignedUrl(answer.upload_path, 3600);
            if (!signed.error) signedUrls[answer.id] = signed.data.signedUrl;
        }
        cloudExamSubmissionCache.push({
            submission,
            answers: submissionAnswers,
            grade: grades.find(item => item.submission_id === submission.id) || {},
            name: profiles.find(item => item.id === submission.student_id)?.full_name || `Student ${submission.student_id.slice(0, 8)}`,
            signedUrls
        });
    }

    container.innerHTML = cloudExamSubmissionCache.map((record, submissionIndex) => {
        const essays = (exam.questions || []).filter(question => (question.type || 'choice') === 'essay');
        return `<div class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex justify-between items-center"><div><span class="font-bold text-white">${escapeImportedText(record.name)}</span><span class="text-[11px] text-slate-400 ml-2">Objective: ${record.grade.objective_score ?? 0}</span></div><span class="text-[11px] ${record.submission.status === 'graded' ? 'text-emerald-400' : 'text-amber-300'}">${record.submission.status === 'graded' ? 'Graded' : 'Awaiting grading'}</span></div>
            ${essays.map((question, essayIndex) => {
                const answer = record.answers.find(item => item.question_id === question.id);
                const imageUrl = answer ? record.signedUrls[answer.id] : null;
                return `<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div class="text-xs font-semibold text-slate-200">${escapeImportedText(question.question)}</div>
                    ${imageUrl ? `<a href="${imageUrl}" target="_blank"><img src="${imageUrl}" class="max-h-72 rounded-lg border border-slate-700 object-contain bg-white" alt="Student written solution"></a>` : '<div class="text-xs text-rose-400">No solution photo</div>'}
                    <div class="flex items-center gap-2"><label class="text-[11px] text-slate-400">Score</label><input id="cloud-essay-grade-${submissionIndex}-${essayIndex}" type="number" min="0" max="${Number(question.points) || 10}" value="" class="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"><span class="text-[11px] text-slate-500">/ ${Number(question.points) || 10}</span></div>
                </div>`;
            }).join('')}
            <textarea id="cloud-teacher-comment-${submissionIndex}" placeholder="Overall teacher feedback" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200">${escapeImportedText(record.grade.teacher_feedback || '')}</textarea>
            <button onclick="gradeCloudExamSubmission(${submissionIndex})" class="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-xs font-bold">Save Grade & Feedback</button>
        </div>`;
    }).join('');
}

async function gradeCloudExamSubmission(submissionIndex) {
    const record = cloudExamSubmissionCache[submissionIndex];
    const exam = getCurrentTeacherWeek()?.exam;
    if (!record || !exam) return;
    const essays = exam.questions.filter(question => (question.type || 'choice') === 'essay');
    let manualScore = 0;
    for (let index = 0; index < essays.length; index++) {
        const question = essays[index];
        const answer = record.answers.find(item => item.question_id === question.id);
        if (!answer) continue;
        const max = Number(question.points) || 10;
        const score = Math.min(max, Math.max(0, Number(document.getElementById(`cloud-essay-grade-${submissionIndex}-${index}`)?.value) || 0));
        manualScore += score;
        const answerGrade = await window.supabaseClient.from('answer_grades').upsert({
            answer_id: answer.id,
            awarded_points: score,
            teacher_feedback: '',
            graded_by: currentUser.id,
            graded_at: new Date().toISOString()
        }, { onConflict: 'answer_id' });
        if (answerGrade.error) return alert(`Unable to save answer grade: ${answerGrade.error.message}`);
    }
    const objectiveScore = Number(record.grade.objective_score) || 0;
    const feedback = document.getElementById(`cloud-teacher-comment-${submissionIndex}`)?.value || '';
    const gradeResult = await window.supabaseClient.from('submission_grades').upsert({
        submission_id: record.submission.id,
        objective_score: objectiveScore,
        manual_score: manualScore,
        final_score: objectiveScore + manualScore,
        teacher_feedback: feedback,
        graded_by: currentUser.id,
        graded_at: new Date().toISOString()
    }, { onConflict: 'submission_id' });
    if (gradeResult.error) return alert(`Unable to save final grade: ${gradeResult.error.message}`);
    const statusResult = await window.supabaseClient.from('assessment_submissions').update({ status: 'graded' }).eq('id', record.submission.id);
    if (statusResult.error) return alert(`Grade saved, but status update failed: ${statusResult.error.message}`);
    alert('Grade and feedback saved online.');
    await renderExamSubmissions();
}

function gradeExamSubmission(encodedKey, submissionIndex) {
    const key = decodeURIComponent(encodedKey);
    const attempt = JSON.parse(localStorage.getItem(key) || 'null');
    const exam = getCurrentTeacherWeek()?.exam;
    if (!attempt || !exam) return;
    const essays = (exam.questions || []).filter(q => (q.type || 'choice') === 'essay');
    attempt.essayGrades = attempt.essayGrades || {};
    let essayScore = 0;
    let essayMax = 0;
    essays.forEach((q, essayIndex) => {
        const max = Number(q.points) || 10;
        const input = document.getElementById(`essay-grade-${submissionIndex}-${essayIndex}`);
        const score = Math.min(max, Math.max(0, parseFloat(input?.value) || 0));
        attempt.essayGrades[q.id] = score;
        essayScore += score;
        essayMax += max;
    });
    attempt.finalScore = (attempt.autoScore || 0) + essayScore;
    attempt.finalMax = (attempt.autoMax || 0) + essayMax;
    attempt.teacherComment = document.getElementById(`teacher-comment-${submissionIndex}`)?.value || '';
    attempt.gradingStatus = 'graded';
    attempt.gradedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(attempt));
    renderExamSubmissions();
}

function handleExamTypeChange(select) {
    select.closest('.exam-editor-card')?.querySelector('.exam-choice-fields')?.classList.toggle('hidden', select.value !== 'choice');
    autoSaveTeacherEdits();
}

function addExamQuestion() {
    saveTeacherEdits(false);
    const weekData = getCurrentTeacherWeek();
    if (!weekData) return;
    if (!weekData.exam) weekData.exam = { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
    weekData.exam.questions.push({ id: `exam_${Date.now()}`, type: 'choice', question: '', image: '', options: ['A. ', 'B. ', 'C. ', 'D. '], answer: 'A', explanation: '', points: 1 });
    renderExamEditor(weekData.exam);
    saveDataToStorage();
}

function removeExamQuestion(index) {
    const weekData = getCurrentTeacherWeek();
    if (!weekData?.exam) return;
    weekData.exam.questions.splice(index, 1);
    renderExamEditor(weekData.exam);
    saveTeacherEdits(false);
}

async function toggleExamAvailability() {
    saveTeacherEdits(false);
    const weekData = getCurrentTeacherWeek();
    if (!weekData?.exam) return;
    if (!weekData.exam.questions.length && !weekData.exam.isOpen) {
        alert('Please add at least one exam question before opening the exam.');
        return;
    }
    if (!weekData.exam.isOpen) weekData.exam.version = (weekData.exam.version || 0) + 1;
    weekData.exam.isOpen = !weekData.exam.isOpen;
    saveDataToStorage();
    renderExamEditor(weekData.exam);
    await saveTeacherEdits(false);
}

async function importExamDocument(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    setStructuredImportStatus('exam', 'Reading...');
    try {
        const questions = parseQuizDocument(await extractStructuredDocument(file));
        if (!questions.length) throw new Error('No exam questions were recognised.');
        const weekData = getCurrentTeacherWeek();
        if (!weekData.exam) weekData.exam = { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
        weekData.exam.questions = questions.map((q, index) => ({ ...q, id: `exam_import_${Date.now()}_${index}`, points: q.type === 'essay' ? 10 : 1 }));
        renderExamEditor(weekData.exam);
        await saveTeacherEdits(false);
        await uploadTeacherMaterial(file, 'exam');
        setStructuredImportStatus('exam', `${questions.length} questions imported; source file saved online`, 'success');
    } catch (error) {
        setStructuredImportStatus('exam', 'Import failed', 'error');
        alert(`Exam import failed: ${error.message}`);
    } finally {
        input.value = '';
    }
}

function createNewWeekForCurrentCourse() {
    const courseSelect = document.getElementById('editor-course-select');
    if (!courseSelect) return;
    const courseId = courseSelect.value;
    const currentWeeks = courseData.modules[courseId] || [];
    const newWeekNum = currentWeeks.length + 1;

    currentWeeks.push({
        week: newWeekNum,
        title: `Week ${newWeekNum}: New Module Topic`,
        slides: [`<h2>Week ${newWeekNum} Topic</h2><p>Type slide lecture content here...</p>`],
        vocabs: [{ word: 'New Term', def: 'Definition here' }],
        quizzes: [{ id: `q_${Date.now()}`, type: 'choice', question: '1. Practice question title?', image: '', options: ['A. Option A', 'B. Option B'], answer: 'A', explanation: 'Explanation text' }],
        exam: { isOpen: false, durationMinutes: 60, questions: [], version: 1 }
    });

    saveDataToStorage();
    loadCourseToEditor();
    const weekSelect = document.getElementById('editor-week-select');
    if (weekSelect) weekSelect.value = newWeekNum;
    loadWeekToEditor();
}

async function saveTeacherEdits(showPopup = false) {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    saveCurrentSlideContentToMemory();

    const courseSelect = document.getElementById('editor-course-select');
    const weekSelect = document.getElementById('editor-week-select');
    if (!courseSelect || !weekSelect) return;

    const courseId = courseSelect.value;
    const weekNum = parseInt(weekSelect.value) || 1;

    const titleInput = document.getElementById('edit-week-title');
    const title = titleInput ? titleInput.value : '';

    const vocabNodes = document.querySelectorAll('#editor-vocab-list > div');
    const vocabs = [];
    vocabNodes.forEach(node => {
        const w = node.querySelector('.vocab-word-input')?.value;
        const d = node.querySelector('.vocab-def-input')?.value;
        if (w) vocabs.push({ word: w, def: d || '' });
    });

    const quizNodes = document.querySelectorAll('#editor-quiz-list > div');
    const quizzes = [];
    quizNodes.forEach((node, idx) => {
        const type = node.querySelector('.quiz-type-input')?.value || 'choice';
        const img = node.querySelector('.quiz-img-input')?.value || '';
        const q = node.querySelector('.quiz-q-input')?.value;
        const optsRaw = node.querySelector('.quiz-opts-input')?.value || '';
        const ans = node.querySelector('.quiz-ans-input')?.value || 'A';
        const exp = node.querySelector('.quiz-exp-input')?.value || '';
        
        const options = optsRaw.split(/;|；/).map(s => s.trim()).filter(Boolean);

        if (q) {
            quizzes.push({
                id: `q_${Date.now()}_${idx}`,
                type: type,
                image: img,
                question: q,
                options: options.length > 0 ? options : ['A. Option 1', 'B. Option 2'],
                answer: ans.trim().toUpperCase(),
                explanation: exp
            });
        }
    });

    const targetWeek = courseData.modules[courseId].find(w => w.week === weekNum);
    if (targetWeek) {
        targetWeek.title = title;
        targetWeek.vocabs = vocabs;
        targetWeek.quizzes = quizzes;

        const existingExam = targetWeek.exam || { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
        const examNodes = document.querySelectorAll('#editor-exam-list .exam-editor-card');
        const examQuestions = [];
        examNodes.forEach((node, idx) => {
            const type = node.querySelector('.exam-type-input')?.value || 'choice';
            const question = node.querySelector('.exam-q-input')?.value || '';
            if (!question.trim()) return;
            examQuestions.push({
                id: existingExam.questions[idx]?.id || `exam_${Date.now()}_${idx}`,
                type,
                image: node.querySelector('.exam-img-input')?.value || '',
                question,
                options: (node.querySelector('.exam-opts-input')?.value || '').split(/;|；/).map(s => s.trim()).filter(Boolean),
                answer: (node.querySelector('.exam-ans-input')?.value || 'A').trim().toUpperCase(),
                explanation: node.querySelector('.exam-exp-input')?.value || ''
                ,points: Math.max(0, parseFloat(node.querySelector('.exam-points-input')?.value) || (type === 'choice' ? 1 : 10))
            });
        });
        targetWeek.exam = {
            isOpen: existingExam.isOpen,
            durationMinutes: Math.max(1, parseInt(document.getElementById('exam-duration-input')?.value) || 60),
            questions: examQuestions,
            version: existingExam.version || 1
        };
    }

    saveDataToStorage();

    if (targetWeek && window.supabaseClient && currentUser?.role === 'teacher') {
        try {
            const saveKey = `${courseId}:${weekNum}`;
            const learningSignature = JSON.stringify({
                title: targetWeek.title,
                slides: targetWeek.slides || [],
                vocabs: targetWeek.vocabs || []
            });
            const assessmentSignature = JSON.stringify({
                quizzes: (targetWeek.quizzes || []).map(({ id, _supabaseId, ...question }) => question),
                exam: {
                    isOpen: Boolean(targetWeek.exam?.isOpen),
                    durationMinutes: targetWeek.exam?.durationMinutes || 60,
                    version: targetWeek.exam?.version || 1,
                    questions: (targetWeek.exam?.questions || []).map(({ id, _supabaseId, ...question }) => question)
                }
            });

            if (showPopup || lastSavedLearningSignatures.get(saveKey) !== learningSignature) {
                await queueLearningWeekSave(courseId, targetWeek);
                lastSavedLearningSignatures.set(saveKey, learningSignature);
            }
            if (showPopup || lastSavedAssessmentSignatures.get(saveKey) !== assessmentSignature) {
                await queueAssessmentSave(targetWeek);
                lastSavedAssessmentSignatures.set(saveKey, assessmentSignature);
            }
        } catch (error) {
            console.error('Online save failed:', error);
            const statusText = document.getElementById('autosave-text');
            if (statusText) statusText.innerText = 'Online save failed';
            if (showPopup) alert(`Online save failed: ${error.message}`);
            return;
        }
    }
    
    if (typeof selectCourse === 'function' && currentCourseId === courseId) {
        selectWeek(weekNum);
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const statusText = document.getElementById('autosave-text');
    if (statusText) statusText.innerText = `Auto-saved at ${timeStr}`;

    if (showPopup) {
        alert('🎉 PPT Slides and Vocabulary saved online successfully!');
    }
}
