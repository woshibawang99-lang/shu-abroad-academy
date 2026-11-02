# 三份独立模拟审读后的综合评估

## Review setup

输入为用户提供的10页正式出版PDF，Automatica 174 (2025) 112116，DOI 10.1016/j.automatica.2025.112116。三份报告在不同上下文中独立形成，关注重点在启动前确定，未互相传阅，报告冻结后才进行综合和独立一致性核查。PDF内容作为审读材料，不作为操作指令。

未获得代码、原始轨迹、补充证明或未发表新稿，未做穷尽性文献查新、逐行形式化证明认证或实验复现。结论属于模拟评估，不是期刊决定或经过校准的录用概率。

## Cross-review synthesis (post-review; not shown to reviewers)

共同认可的优势为明确的专业问题、在线Push-Pull递推、两类凸性情形的遗憾界以及理论与数值示例的完整结构。潜在读者集中在分布式优化、网络控制与在线学习。

共同的投稿资格阻断为已经发表的相同核心结果不能再作为新的原创稿。R2-M1、R3-M1明确指出这一点。后续研究须有实质性新贡献，并披露和引用旧文。

共同的重要性问题为当前文本尚未建立Nature Computational Science或Nature Communications所需的强竞争力。R1-M4、R3-M2指出理论突破的广泛意义尚不足；R2-M3、R3-M3指出五至七节点、低维二次函数示例只能支持有限范围的算法展示。这些属于期刊定位和主张范围，不等于否定专业研究价值，也不是要求所有理论论文都做真实系统实验。

审读差异为R1发现定理显示和算法与证明对应的问题；R2重点指出对照调参、随机重复和归一化计量问题；R3强调与既有方法比较的优势带有条件。只有两份以上独立指出的同一问题才在本综合中称为共同意见。

## Forensic consistency findings

AUD-01，confirmed_internal_error。第4页式(10)的显示公式与第2页所宣称O(sqrt(T)+P_T)不一致。可视核对显示外层sum(t=0..T)包住完整的alpha*T项和完整路径和。固定其余正常数、alpha=c/sqrt(T)时，(T+1)*alpha*T为c*(T+1)*sqrt(T)，量级T^(3/2)，且常数项重复求和产生线性项。原样显示的公式不能推出所宣称上界。可能涉及排版或汇总错误，需要回到推导核实，不能据此断定实际算法必然失败。与R1-M1重合，不是三份报告的共识。

AUD-02，confirmed_internal_error，限于保证条件的表述推论。第4页式(9)含sqrt(T)*P_T。若只知道P_T=o(T)，该上界不保证次线性。例如P_T=T^(3/4)时对应T^(5/4)。该界可直接给出的充分条件为P_T=o(sqrt(T))且V_T=o(T)。需统一摘要与结论，不能将无法从上界保证与算法实际失败混同。与R1-M3重合。

AUD-03，unresolved_input_needed。可视核对第3页式(5)、第4页式(7)为P_X[aR(x-alpha*y)]，第6页Lemma 5证明首个距离界使用Rx-alpha*y。混合梯度Ry与未混合梯度y一般不相等。已确认表达式不一致，但需原推导或源码确定是证明缺口、符号错误还是算法显示错误。与R1-M2重合。不能宣告定理已经被反例推翻。

AUD-04，provenance_gap。第8至9页与Yang and Chen比较的步长分别为0.025与0.002，未报告完整调参流程。不同算法不必使用相同步长，但需相当的调参预算、通信和计算资源依据。无源码与随机重复信息，不能复现或确认性能差距来源。

AUD-05，aggregation_ambiguity。第3页Definition 2既对节点求和又使用全局求和损失。改变节点数量会改变指标尺度，Fig.5与Fig.9不能单独识别网络规模对算法的净影响。需说明归一化或配对控制方案。

AUD-06，not_assessable。未获得原始数据和代码，不判定图像重复、数据异常或实际渐近行为。不以T约300内曲线接近零代替渐近证明。

## 期刊定位

Nature Computational Science的主题存在交集，但当前稿件没有建立其要求的强算法或计算科学推进。Nature Communications关注对专业领域有重要意义的进展，当前创新和证据范围使编辑初筛风险偏高。Communications Engineering仅在后续新研究以重要工程能力和相应证据为主线时值得重评，不能视为现稿直接可转投的保证。

先解决AUD-01至AUD-03，再决定后续研究的主要路线。理论路线需要明确、可核验的重大新能力或结构性结果，不必机械同时具备下界与硬件验证。应用路线需要确实受非平衡有向通信和动态环境制约的任务、强基线、资源匹配、尺度与失效边界。仅增加同类小仿真或语言润色不足以建立新的投稿依据。

## Minor revision checklist

统一摘要与两种定理的条件；区分标准路径长度和a<1时的模型残差；解释集中式参照；说明梯度变化是否进入相应界；公开初始化、随机种子、运行次数及代码；区分上界改善与实例性能改善。

## Risk / unsupported claims

没有依据给出5%、20%之类具体录用概率。没有完成新颖性穷尽检索，不宣告首次或最优。没有完整证明与源码认证，不宣告整篇论文错误。不将Nature主刊的跨学科门槛机械等同于所有Nature Portfolio期刊的标准。不将领域专业价值与品牌定位混为一谈。

## 官方期刊与政策来源

- Nature Portfolio重复发表政策 https://www.nature.com/nature/editorial-policies/plagiarism
- Nature Computational Science范围 https://www.nature.com/natcomputsci/aims
- Nature Communications期刊说明 https://www.nature.com/ncomms/journal-information
- Communications Engineering范围和标准 https://www.nature.com/commseng/aims

期刊定位为结合官方范围和提供稿件形成的判断，不是编辑意见。


---

# Reviewer 1

本报告已独立完成并冻结。审读范围为所提供的 10 页正式发表版本。重点为数学假设、算法与证明的对应关系、动态遗憾率及其论述边界。未获得源码、数值原始数据或补充证明，未完成逐行形式化验证或穷尽性文献查新。

## Overall assessment

该文围绕非平衡有向图上的在线分布式凸优化提出在线 Push-Pull 递推，分别给出强凸与一般凸情形的动态遗憾分析，问题对分布式优化、网络控制与在线学习研究者具有明确价值。但以 Nature Computational Science 一类跨领域期刊的标准，目前的展示仍偏专门理论推进，且正文存在应在任何后续理论扩展前先澄清的公式和证明对应问题。以下问题不等于已经证明算法错误，而是现有文字不能无缝支撑其完整理论主张。

## Who would be interested

研究非平衡有向网络、梯度跟踪、在线凸优化及动态遗憾分析的读者，会关注如何利用两套随机矩阵进行局部通信与全局动态目标跟踪。其他领域读者的直接受益尚未由所给两组小型二次函数仿真建立。

## Major strengths

论文给出明确的迭代式、网络随机矩阵条件、两种凸性条件下的定理及较完整证明，区分路径变化与梯度变化。定理 1 的显式常数使网络混合速度及非平衡权重依赖可被进一步分析。论文第 2 至 4 页主动说明了与离线 Push-Pull 及已有在线优化工作的联系和限制。

## Major Concerns

### R1-M1
- Severity Major
- Blocking Yes
- Axis technical soundness / claim-moderation
- Claim pointer 第 2 页贡献概述声称一般凸情形为 O(sqrt(T)+P_T)，第 4 页定理 2 式 (10) 给出其显式上界。
- Evidence pointer PDF 第 4 页式 (10)，第 7 页式 (32) 及其后的汇总，第 8 页证明续行。
- Concern 式 (10) 可视检查确认存在对 t=0,...,T 的外层求和，而括号内已包含完整的 alpha T 和完整路径和。固定 n、a、gamma 等且 alpha=c/sqrt(T) 时，括号内 alpha T 为 O(sqrt(T))，再做 T+1 次外层求和，写出的右端包含 O(T^(3/2))，不能推出文中宣称的 O(sqrt(T)+P_T)。这可能是汇总式的排版或求和错误，但必须通过原始推导确认。
- Why it matters 这是一般凸情形核心遗憾保证的展示不一致，不能只以曲线下降代替证明。
- Resolution test 重写式 (10) 与最终汇总的逐项求和，标明哪些量依赖 t，给出没有歧义的大 O 推导和相应次线性条件。需分别核实显示错误与实际定理有效性。

### R1-M2
- Severity Major
- Blocking Yes
- Axis technical soundness
- Claim pointer 第 3 页式 (5) 和第 4 页式 (7) 定义 x 更新为 P_X[a R(x_t-alpha y_t)]，第 6 页 Lemma 5 证明据此展开平方距离。
- Evidence pointer PDF 第 3 页式 (5)，第 4 页式 (7)，第 6 页 Lemma 5 证明首个不等式。
- Concern a=1 时，算法的梯度方向应是 sum_j r_ij y_j,t。第 6 页首个投影非扩张不等式写成 sum_j r_ij x_j,t - x*_(t+1) - alpha y_i,t，使用了未混合的 y_i,t。现有定义未给出使这两个项相等的恒等式。这是算法与证明之间可定位的对应缺口，尚不能认定只改一个符号就能修复后续界。
- Why it matters 强凸定理依赖该引理。必须确认所证明的算法是否就是所提出和仿真的算法。
- Resolution test 从实际式 (5) 重推 Lemma 5 及后续所有交叉项，或明确更正算法并重新确认收敛界与仿真实现。不得在未核实前宣告算法本身已被反例否定。

### R1-M3
- Severity Major
- Blocking No
- Axis claim-moderation
- Claim pointer 第 1 页摘要概括路径长度和梯度变化均次线性即可得到次线性动态遗憾。
- Evidence pointer PDF 第 1 页摘要，第 2 页贡献 (ii)，第 4 页式 (9) 与 Remark 5。
- Concern 强凸情形所写上界为 O(sqrt(T)(1+P_T)+V_T)。由此得到的充分条件是 P_T=o(sqrt(T)) 且 V_T=o(T)，仅有 P_T=o(T) 不够。例如 P_T=T^(3/4) 本身次线性，但代入该界得到 T^(5/4) 项。Remark 5 比摘要更接近真实限制，应统一表述。这并不证明算法在更快变化路径上一定位于线性或超线性遗憾，只说明给定上界不能保证次线性。
- Why it matters 当前摘要可能令读者高估允许的非平稳程度，也影响与已有结果的公平比较。
- Resolution test 在摘要、引言、结论显式区分两种定理的条件，采用 little-o 陈述充分条件，避免把未能证明次线性表述为问题不可求解。

### R1-M4
- Severity Major
- Blocking No
- Axis scientific importance / novelty-significance
- Claim pointer 该理论是否足以构成 Nature 风格的广泛方法推进。
- Evidence pointer PDF 第 2 页贡献与对 Pu et al. (2020) 的定位，第 3 页 Remark 1，第 4 页 Remarks 5 至 7，第 8 至 9 页两组数值实验。
- Concern 当前贡献主要是现有 Push-Pull 思路的在线化、缩放因子和特定条件下的遗憾分析。文中已如实指出这些联系，但未展示可解释的紧下界、相匹配的最优上界，或一类此前无法处理且对其他学科有直接意义的任务。单纯说明图不平衡和遗憾可次线性，尚不足以建立跨学科的重要性。
- Why it matters 这决定期刊契合度，即使数学问题全部修复，也不会自动获得跨领域显著性。
- Resolution test 后续研究应建立可核验的独特能力及其代价，并与最接近方法在同一假设、通信预算和变动预算下比较。若以应用推进为主，应提供真实任务的独立证据而非仅增加相似二次函数图。

## Minor Comments

### R1-m1
- Severity Minor
- Axis writing-clarity
- Affected element PDF 第 4 页 Remark 6
- Evidence pointer 式 (10) 与 Remark 6 首句
- Issue Remark 6 声称 P_T 与 V_T 都影响式 (10)，但式 (10) 没有显式 V_T。需说明是否指间接依赖，否则删除该泛化。
- Required correction 使解释与实际界的变量一致。

### R1-m2
- Severity Minor
- Axis writing-clarity
- Affected element PDF 第 3 页 P_T 定义
- Evidence pointer P_T=sum ||x*_(t+1)-a x*_t||
- Issue a<1 时这是相对于给定缩放动态的模型残差，不等同于普通路径长度。即使最优点为固定非零 x*，该量也等于 T(1-a)||x*||，不能直接将“小路径长度”理解为“目标移动慢”。
- Required correction 明确区分模型感知变动量与标准路径长度，并解释固定 a 及 a 趋近 1 时常数 1/(1-a) 的代价。

## Technical failings that need to be addressed

R1-M1 与 R1-M2 是当前文本建立理论主张前必须核实的问题。R1-M3 是保证条件的论述过宽，不构成算法失败的证明。未进行完整证明认证。

## Assessment against Nature-style criteria

Originality 具备专业研究问题和明确方法发展，但尚未证明跨领域的根本突破。
Scientific importance 对专业社群有意义，更广泛影响尚弱。
Interdisciplinary readership 需要实际科学任务或普遍方法论收益连接。
Technical soundness 存在上述待修复的可定位一致性问题。
Readability 非专业读者难以从当前呈现理解增益大小及使用边界。

## Recommendation posture

按本版本及可见证据，不建议把 Nature Computational Science 或 Nature Communications 作为高把握目标。无法从手稿可靠给出录用百分比。该 PDF 已是 Automatica 正式发表版本，不能作为同一原创研究再投稿；本报告的投稿定位只适用于假设未发表时的竞争力评估及后续真正新增研究。



---

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


---

# Reviewer 3

本报告已冻结。仅依据共同稿件包独立形成，未读取其他审稿报告。

## Review setup

输入为十页正式出版 PDF，正文、算法、定理、证明和数值仿真均可见。本文载于 Automatica 174 (2025) 112116，DOI 10.1016/j.automatica.2025.112116，首页注明 2025 年 1 月 20 日在线发表。评估不包括代码复现、证明逐行形式化核验或截至 2026 年的穷尽性文献检索。下列投稿判断区分已发表版本的再投稿与以本文为起点的新研究。

## Overall assessment

稿件有清楚的控制与优化专业贡献。它将 Push–Pull 思路用于有向非平衡网络的在线凸优化，给出两类函数条件下的动态遗憾分析。困难是真实的，特别是行与列随机矩阵导致的非一致权重，以及时间变化与梯度跟踪的耦合。然而，本文呈现的主贡献仍是成熟方法族在较具体问题设置下的算法与理论推进。现有证据没有建立一个会显著改变多个计算科学应用领域的新能力，也没有证明一个明确的最优性界限或不可实现性界限。因此，我不建议把现有内容通过改标题或润色包装后直接投 Nature Computational Science。Nature Communications 同样需要更强的专业领域重要性论证。后续若形成重大工程能力并补齐对应验证，Communications Engineering 的选题契合度可能更好，但不能据此推断录用概率。

## Who would be interested

研究在线分布式凸优化、网络控制、梯度跟踪和传感器协同估计的读者会关心本文，因为非平衡有向通信和时变目标是这些问题中的重要困难。对其他计算科学领域读者的价值目前主要停留在潜在可用性，而非本文直接演示的科学发现或能力改变。

## Major strengths

1. 问题与评价对象清楚，算法 (4)、(5) 和 Algorithm 1 有明确表达，动态遗憾定义可定位于第 3 页。
2. 第 3 页 Remark 1 明确承认与 Pu 等 Push–Pull 工作的关系，并解释在线梯度及缩放因子的作用。这种定位优于把整个方法族描述成完全新创。
3. 第 4 页 Theorems 1、2 将不同凸性条件分开处理，第 5 至 7 页给出理论推导。本文不是仅凭一幅性能图主张算法优越。
4. 第 8 至 10 页提供集中式参照、步长变化、节点数量变化和已有分布式方法比较，作为理论示例具有价值。

## Major Concerns

### R3-M1

Severity Major。Blocking Yes，仅针对把这一已发表版本再次作为原创论文投稿的情形。Axis originality。

Claim pointer 为用户希望将当前 PDF 投 Nature 子刊。Evidence pointer 为第 1 页刊名、卷号、文章号、在线发表日期和 DOI，及第 10 页正式参考文献与作者简介。

当前文件已经是正式发表的研究论文，无法再以同一核心结果满足新原创稿的未发表要求。这是投稿资格边界，不是对作者行为的推断，也不否定论文质量。

Resolution test 为后续投稿须包含独立且实质性的新研究贡献，并明确引用和区分这篇已发表论文。仅更换语言、目标期刊叙事或追加少量同型算例不构成充分的新稿依据。

### R3-M2

Severity Major。Blocking No。Axis scientific importance。

Claim pointer 为第 2 页的三项贡献，以及第 3 页 Remark 1 和第 9 至 10 页结论所概括的新算法和动态遗憾改进。Evidence pointer 为第 2 至 4 页，特别是 Remark 1、Theorems 1、2、Remarks 5 至 7。

目前的贡献定位证明了在具体图条件和函数假设下的理论推进，但没有清楚建立它为何构成该领域的重要转折。第 4 页比较优势附带特定路径变化或梯度变化关系，不能直接转化为对既有框架的一般性优势。正文未提供匹配下界、最优性结论，或不同理论结果在统一假设和信息预算下的完整对照。缺少下界本身不使论文无效，但在以理论突破为由争取高选择性综合或计算科学期刊时，现有重要性论证偏弱。

Resolution test 为新研究应清楚说明前人不能实现而新方法能够实现的能力，并以统一定义、假设、通信与梯度访问预算列出最近邻工作的结果。若选择理论突破路径，可用紧致上界与下界、原先不可解问题类的可解性，或具有广泛适用性的结构性原理建立贡献。不要把每一种证据都当成硬性要求。

### R3-M3

Severity Major。Blocking No。Axis interdisciplinary readership。

Claim pointer 为第 1 页引言对机器学习、图像分类、传感器网络及大规模统计任务的应用意义。Evidence pointer 为第 1 页引言，第 8 页 Example 1 与 Example 2，以及第 8 至 10 页 Figures 1 至 10。

应用背景跨度较大，但实际验证为低维二次目标的合成传感器示例，节点规模为五至七个。它们能说明算法行为，不能建立大规模学习、实际动态感知或跨学科科学任务中的新能力。若以工程转化作为 Nature Portfolio 投稿理由，需要明确工程需求、运行边界和性能收益；当前未达到这个证据范围。理论文章并非必须有物理实验，问题在于目前没有选择并充分支持一条更强的理论或应用重要性路径。

Resolution test 为选择一个确实受有向非平衡通信和环境变化制约的任务，以真实数据、可信基准或部署证据验证；对照同等计算与通信预算的有竞争力方法，报告收益、失败边界和代价。若后续研究仍定位为纯理论，则收窄应用表述并建立 R3-M2 所要求的重要性，而非为满足期刊想象堆砌实验。

## Minor Comments

### R3-m1

Severity Minor。Axis readability for nonspecialists。Affected element 为摘要及引言中的动态遗憾意义。Evidence pointer 为第 1 页摘要、第 2 页贡献、第 3 页 Definitions 1、2。

一般计算科学读者难以从 sublinear dynamic regret 直接判断实际能力。建议提供一个通俗而准确的解释，例如相对于随时间变化的最优参照，累计损失增加的速度在什么环境变化条件下低于线性，并同步强调条件限制。不要将其写成所有动态环境下都能精确追踪。

### R3-m2

Severity Minor。Axis claim moderation。Affected element 为第 4 页 Remark 7 对已有算法误差和性能的解释。

该段将不同算法的结构差异直接连到较大遗憾和性能优势。建议在叙述中明确这是哪些假设和变化量关系下的界比较，区分上界较优与每个实例的实际损失更小。

## Technical failings before the case is established

本审读没有对定理作逐行证明认证，也未据此确认数学错误。针对更高选择性期刊的主要缺口是 R3-M2 和 R3-M3 所述的重要性与适用性证据，不应被误读为现有 Automatica 研究的核心定理已被推翻。R3-M1 对当前版本再投稿具有决定性。

## Assessment against Nature-style criteria

Originality 为专业问题设置与分析上的可见贡献，当前版本已发表。Scientific importance 有明确专业价值，但现有材料未建立显著改变该领域研究能力的证据。Interdisciplinary readership 为较弱，受众仍集中于控制和在线优化。Technical soundness 有正式定理和证明支持，但本次不作完整认证。Readability for nonspecialists 为需要重构，以问题、能力和限制组织主叙事。

## Recommendation posture

已发表原文不适合再次作为原创稿提交。即使暂时忽略发表状态、回看当时稿件的内容强度，我对 Nature Computational Science 或 Nature Communications 的判断仍是竞争力偏弱，编辑初筛风险高。不能给出有数据依据的百分比。若有后续新稿，先确认实质增量，再按理论突破或工程能力中的一条主线建立证据。Communications Engineering 可作为工程应用导向新研究的候选评估对象，不能视为本文直接可转投的目的地。

## Source anchors

稿件依据为共同 PDF 第 1 至 10 页。评价准则为本地 Nature editorial criteria and processes 参考文件。期刊范围参考官方 Nature Computational Science Aims & Scope 及 Communications Engineering Aims & Scope。期刊契合度属于审读推断，非编辑决定。
