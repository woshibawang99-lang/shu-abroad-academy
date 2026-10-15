function escapePortalText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderMathContent(root = document) {
    if (!root || typeof window.renderMathInElement !== 'function') return;
    try {
        window.renderMathInElement(root, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false,
            strict: false
        });
    } catch (error) {
        console.warn('Math rendering skipped:', error);
    }
}

// 有效测试账号
const validAccounts = {
    students: { 
        'cgy': 'cgy' ,
        'xtt': 'xtt' 
    },
    teachers: { 'zs': 'zs' }
};

// 5 门课程配置（含高清课程配图）
const defaultCourseList = [
    { 
        id: 'c1', 
        title: 'Fundamentals of Financial and Management Accounting', 
        category: 'Accounting',
        image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
        badge: 'Core Module',
        desc: 'Learn the fundamental principles of financial and management accounting.',
        targetDegree: 'Financial and Management Accounting'
    },
    { 
        id: 'c2', 
        title: 'Introduction to Digital Business', 
        category: 'Digital Business',
        image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=600&q=80',
        badge: 'Digital Skills',
        desc: 'Explore digital business models, technologies and organisational transformation.',
        targetDegree: 'Digital Business and Innovation'
    },
    { 
        id: 'c3', 
        title: 'Introduction to Economics', 
        category: 'Economics',
        image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80',
        badge: 'Core Module',
        desc: 'Understand essential microeconomic and macroeconomic concepts and applications.',
        targetDegree: 'Economics and Business'
    },
    { 
        id: 'c4', 
        title: 'Professional Development', 
        category: 'Professional Skills',
        image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=600&q=80',
        badge: 'Career Skills',
        desc: 'Build communication, teamwork, leadership and career-planning capabilities.',
        targetDegree: 'Professional and Career Development'
    },
    { 
        id: 'c5', 
        title: 'Quantitative Methods 1a', 
        category: 'Quantitative Methods',
        image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
        badge: 'Essential Skills',
        desc: 'Develop core mathematical and statistical techniques for business analysis.',
        targetDegree: 'Quantitative Methods for Business'
    }
];

let courseData = {
    courses: defaultCourseList,
    modules: {
        'c1': [
            {
                week: 1,
                title: 'Week 1: 金融市场与资本流动概论',
                slides: [
                    `<h1>Week 1: 导论与背景</h1><p>欢迎来到 ShuAbroadAcademy 《商科与金融学》第一周课程。</p><p>本周的核心目标是帮助大家厘清海外一级与二级金融市场的运行逻辑。</p>`,
                    `<h2>资本市场两大核心功能</h2><p>1. <b>资源优化配置</b>：将闲置资本高效引导至高回报生产领域。</p><p>2. <b>风险转移与分散</b>：利用衍生品与资产组合平抑市场波动。</p>`,
                    `<h2>资产定价模型 (CAPM) 基本原理</h2><p>CAPM 描述了资产预期收益率与系统性风险之间的函数关系：</p><p><b>E(R_i) = R_f + β_i * [E(R_m) - R_f]</b></p>`
                ],
                vocabs: [
                    { word: 'Methodology', def: '研究方法论' },
                    { word: 'Liquidity', def: '市场流动性' },
                    { word: 'Asset Allocation', def: '资产配置' }
                ],
                quizzes: [
                    {
                        id: 'q1',
                        type: 'choice', // 选择题
                        question: '1. 下列选项中，不属于金融市场基本功能的是？',
                        image: '', // 可填图表/函数图像 URL
                        options: ['A. 风险转移与分散', 'B. 资源优化配置', 'C. 彻底消除市场波动', 'D. 资产价格发现'],
                        answer: 'C',
                        explanation: '解析：金融市场可以有效分散非系统性风险，但无法彻底消除系统性市场波动。'
                    },
                    {
                        id: 'q2',
                        type: 'essay', // 解答题
                        question: '2. 【解答题/计算分析】请推导并说明资本资产定价模型 (CAPM) 中 Beta (β) 系数的经济学含义。请在纸上书写完整推导过程并拍照上传。',
                        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80', // 曲线/图表示例
                        options: [],
                        answer: '详见标准求解过程',
                        explanation: '参考解答：Beta (β) 系数衡量单只资产或投资组合相对于整体资本市场的系统性风险。当 β = 1 时，资产波动与市场同步；当 β > 1 时，资产波动幅度大于市场。'
                    }
                ]
            }
        ]
    }
};

function initCourseData() {
    const savedData = localStorage.getItem('shu_course_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed && parsed.courses && parsed.modules) {
                parsed.courses = defaultCourseList.map(defaultItem => {
                    const found = parsed.courses.find(c => c.id === defaultItem.id);
                    return {
                        ...(found || {}),
                        ...defaultItem
                    };
                });

                Object.keys(parsed.modules).forEach(cid => {
                    parsed.modules[cid].forEach(w => {
                        if (!w.slides) {
                            w.slides = w.lecture ? [w.lecture] : ['<p>请在此输入幻灯片内容...</p>'];
                        }
                        // 兼容题目 type 字段
                        if (w.quizzes) {
                            w.quizzes.forEach(q => {
                                if (!q.type) q.type = 'choice';
                                if (!q.image) q.image = '';
                            });
                        }
                        if (!w.exam) {
                            w.exam = { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
                        }
                    });
                });

                courseData = parsed;
            }
        } catch (e) {
            console.warn('读取本地数据失败，已恢复默认课程数据。');
        }
    }

    Object.keys(courseData.modules).forEach(cid => {
        courseData.modules[cid].forEach(w => {
            if (!w.exam) w.exam = { isOpen: false, durationMinutes: 60, questions: [], version: 1 };
            if (!w.exam.version) w.exam.version = 1;
        });
    });
}

function saveDataToStorage() {
    localStorage.setItem('shu_course_data', JSON.stringify(courseData));
}
