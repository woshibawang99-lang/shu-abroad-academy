# Reviewer 2

本报告已独立完成并冻结。审读重点为数值验证、对照公平性、可复现性和应用外推。依据为提供的10页正式出版PDF。未获得代码、随机种子、原始轨迹或补充材料，未完成逐行定理证明复核或穷尽性现有文献查新。本报告不是实际编辑决定。

## Overall assessment

该文提出在线分布式Push–Pull算法并分析非平衡有向图上的动态遗憾，具有清晰的控制与分布式优化领域读者。两组算例可以展示算法运行行为，但还不足以建立具有广泛计算科学影响的新方法，或显著工程能力提升。就现有版本评估，Nature Computational Science或Nature Communications的编辑初筛风险很高；Communications Engineering还需要更明确的工程问题、应用收益与验证。不能据此给出可靠录用百分比。第1页明确是Automatica 174 (2025) 112116已发表版本，不能作为新的原创稿件再次投稿。若用户意指以其为基础发展新研究，以下评估对应需要补强的证据。

## Who would be interested in the results, and why

分布式优化、网络控制和在线学习研究者会关注在非平衡通信拓扑下的动态遗憾界及梯度跟踪。传感网络研究者可能关注目标跟踪，但现有算例尚未证明真实传感系统中的性能或部署收益。

## Major strengths

问题、算法和两类凸性条件下的遗憾分析形成完整技术链条。第8页明确给出5节点权重矩阵，第8至9页还给出6和7节点矩阵，优于仅展示抽象曲线。设置了步长、节点数量、集中式方法及既有算法比较，具有基本验证结构。局限在于验证规模与控制变量，而非完全缺乏对照。

## Major Concerns

### R2-M1

Severity Major。Blocking Yes，仅针对将当前已发表结果作为全新原创稿再投。Axis originality。

Claim pointer 用户拟以本论文投稿Nature子刊。Evidence pointer 第1页刊头、Article history及DOI 10.1016/j.automatica.2025.112116。

Concern 当前材料是正式发表论文，不满足将相同主要结果作为新原创论文提交的前提。这不是数学有效性问题。

Why it matters 投稿可行性必须先区分已发表成果和未发表的新贡献。

Resolution test 提供不同于既有已发表结果的实质性新研究，明确引用和区分既有成果，不以语言改写或添加同类小算例替代新贡献。

### R2-M2

Severity Major。Blocking No。Axis experimental-design。

Claim pointer 第8页Example 1及第9页Example 2声称所提算法优于Yang and Chen (2020)，对应Fig.6、Fig.10。

Evidence pointer 第8页末与第9页末，所提方法步长0.025，对照方法0.002；其余说明未给出统一调参预算、敏感性范围、通信与计算成本匹配规则。

Concern 不同步长本身不证明不公平，也不应机械要求同一步长，但仅凭这些曲线不能区分算法优势与调参选择的贡献。只比较一个既有分布式对手也不足以建立当前广泛先进性。

Why it matters 若向综合性计算科学期刊主张显著性能改进，比较的解释力直接影响创新意义。

Resolution test 为各算法采用合理且透明的独立调参流程，报告敏感性区间和预算，按同等通信轮次与计算成本比较，纳入与新稿最接近的现代方法；保留集中式参照但解释其资源和信息优势。

### R2-M3

Severity Major。Blocking No。Axis claim-moderation。

Claim pointer 第2页称更适合实际优化问题，第8页称通过两组实验验证理论结果，第8至9页以不同n说明节点数增加时遗憾增加。

Evidence pointer 第8页Example 1为一维随机二次损失，Example 2为二维随机二次损失；节点数量仅5、6、7；Fig.5及Fig.9；第3页Definition 2的遗憾同时对节点求和且使用全局求和损失。

Concern 这些是有效的说明性算例，却不是大规模性、工程部署价值或跨场景泛化的实证证据。改变n会同时改变目标函数汇总规模与节点求和计量，不经归一化和配对设计，曲线高低不能独立归因于网络规模导致的算法退化。

Why it matters 当前证据更适合支持专门理论论文，而不足以单独支撑广泛应用影响。理论论文并非必须有硬件实验，关键是与所宣称影响相匹配。

Resolution test 若主打理论突破，补齐与最优界、假设与网络代价的严格比较；若主打应用，选择明确工程任务并给出相关真实数据或系统证据。对规模实验固定每节点问题分布，报告归一化遗憾、通信成本和拓扑条件，覆盖显著更大网络及失效场景。

### R2-M4

Severity Major。Blocking No。Axis reproducibility。

Claim pointer 第8至10页称仿真验证理论并呈现随机生成观测与扰动的性能。

Evidence pointer 第8页两组算例的随机采样说明，第9页Fig.4至Fig.9，第10页Fig.10；提供的全文未给出可执行代码位置、随机种子、重复运行次数或曲线不确定性说明。

Concern 现有材料不能辨明图为单次轨迹还是多次平均，不能检查持续随机扰动下的有限时间表现与渐近遗憾主张之间的关系。例如Fig.7后半段呈明显非零平台，而正文仅称最终接近0。有限T约300的平均遗憾曲线本身不能证明渐近次线性，必须与已验证的理论适用条件对应。

Why it matters 随机算例的可靠性和可重复性影响性能比较可信度，但这些缺失不能直接推出理论错误或不当数据处理。

Resolution test 发布可复现实验配置与代码，记录初始化、随机种子和重复次数，给出均值及离散程度；延长时间范围，直接展示算例中的路径变化和梯度变化随T的增长，并明确每个算例对应哪个定理及其条件。若持续随机创新使相应变化预算线性增长，应将结论收窄为有限时间行为展示。

## Minor Comments

### R2-m1

Severity Minor。Axis figures-and-tables。Affected element Fig.4和Fig.8集中式参照。Evidence pointer 第8页相关文字与第9页图例。Issue 正文未在图附近充分说明集中式对照的更新公式、步长和初始化是否对应同一任务。Required correction 补充可定位算法定义或方法引用、参数和信息获取条件，使读者理解参照含义。

### R2-m2

Severity Minor。Axis writing-clarity。Affected element 第8至9页图说明。Evidence pointer 第8页Fig.2至Fig.6相关叙述，第9页Fig.7至Fig.10。Issue 叙述主要依赖曲线视觉高低，没有给出稳定的定量比较时点或效应量。Required correction 增加事先明确的终点、累计通信预算下指标和不确定性，避免将肉眼接近0写成已证明极限为0。

## Technical failings that need to be addressed before the case is established

原稿再次作为原创投稿受R2-M1阻断。对于建立更强的性能与影响主张，应解决R2-M2至R2-M4。没有从本审读中确证算法或定理数学错误。

## Assessment against Nature-style criteria

Originality 在原专业语境有明确提出的新算法与分析，但本次未完成穷尽性查新，且当前结果已发表。Scientific importance 领域内价值明确，跨社区影响证据尚弱。Interdisciplinary readership 目前主要属于分布式优化与网络控制。Technical soundness 有理论证明结构及小规模数值示例，但实验可复现性和公平比较需要加强。Readability for nonspecialists 需要从具体瓶颈与新能力解释价值，不能只突出技术名词和条件放宽。

## Recommendation posture

不建议将现有稿件仅通过改写包装直接转投Nature系列。若这是后续新项目的基线，应先决定是追求具有基础意义的理论突破，还是围绕明确工程任务证明新能力，再重新评估目标期刊。当前无依据给出数字化录用概率。
