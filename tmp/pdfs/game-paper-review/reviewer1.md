# Reviewer 1

冻结状态，独立报告已完成。审读时未读取其他审稿报告或综合文件。

## 范围与总体评价

材料为 Automatica 175 (2025) 112200 的9页全文、证明、表1及图1至图5。以抽取文本阅读全文，并用原页渲染核对第4至8页的参数、公式、图和论断。没有源码、原始数值或额外补充。以下不是完整形式证明认证，也不是穷尽查新。共同标准采用所给 Nature editorial criteria and processes，以及共同材料包中 Nature Communications 和 Nature Computational Science 的定位标准。

文章试图同时处理快速变化的 Nash 均衡、有向不平衡通信和局部可行集，提供一个紧凑的预测加多步分布式求解框架。其值得理解的思想是，先由上一时刻梯度及其时间导数构造当前梯度，再在每个外部时隙做许多内部优化和通信轮次，最后平均输出。因此，path-length 不出现在界中不意味着无需时间结构和计算代价。式(8)给出的零预测误差，正是整个论证能够绕开未知当前目标的重要支点。

目前最需要解决的不是文章是否写得像 Nature，而是理论链条本身。Lemma 2 的范数收缩断言存在可核验反例，跨时域梯度有界常数没有由列出的假设推出，信息反馈也未明确提供实现算法所需的导数函数。另有推论的幂次求和错误。这些问题不自动证明算法在所有场景失败，但意味着目前文本不能直接建立其所宣称的一般保证。

## 谁会感兴趣及主要优势

分布式控制、在线优化、博弈均衡计算和电力市场算法研究者会关注，因为快速移动的均衡与有向通信确实给跟踪分析带来困难。专业读者也能直接看出局部投影、邻居状态估计和内循环平均之间的关系。

优点包括问题和 regret 指标明确，关键假设集中列出，证明从预测误差到状态误差再到 regret 的依赖关系相对清楚；同时给出电力市场例子、线性增长的路径图，以及两项已有方法的数值比较。这些是可讨论的专业贡献基础，不能仅因其是技术论文就低估。但现有单一理想化例子没有建立广泛科学影响。

## Major Concerns

### R1-M1

- **Severity** Major
- **Blocking** Yes
- **Axis** technical soundness
- **issue_key** induced-norm-contraction
- **claim_pointer** 第4页 Lemma 2 及第5页证明声称，按给定 k1、k2 条件有 ||M||1<1、||M||∞<1，因此 λ=sqrt(||M||1||M||∞)∈(0,1)，并得到式(7)。
- **evidence_pointer** 第4页 Algorithm 1 下参数范围、Lemma 2；第5页左上 Lemma 2 证明，式(17)、式(18)。
- **evidence_status** located
- **Concern** 这些条件不保证所宣称的诱导范数收缩。以 N=3、a12=1、a23=1、a31=2、其余 aij=0 为例，图强连通且不平衡。此时 d_in=(1,1,2)、d_out=(2,1,1)、η+=2、η-=1。取 k1=0.05、k2=0.15，满足 0<k1<1/4 及 2k1<k2<1/4。M=I-k1(L⊗I)-k2Λ 非负。任一 aij=0 的行，其行和为1，因此 ||M||∞=1。列(i=1,j=1)的列和为 1+k1(d_out,1-d_in,1)-k2a11=1.05，故 ||M||1≥1.05，论文所定义 λ≥sqrt(1.05)>1。该反例直接针对范数断言，不需要模拟轨迹。
- **Why it matters** 式(17)中 1/(1-λ) 及式(18)的正界依赖 λ<1。不能由矩阵可能具有谱半径小于1，直接补出文中所写的单步欧氏范数界。
- **resolution_test** 为一般强连通图给出正确的收缩分析，例如适当加权范数或有限步传播界，明确常数及维度依赖，再重新导出 Lemma 2、Theorem 1 和推论。若只能在更强图假设下成立，应准确收窄定理。区分证明有误与算法必然失效。

### R1-M2

- **Severity** Major
- **Blocking** Yes
- **Axis** technical soundness
- **issue_key** horizon-uniform-gradient-bound
- **claim_pointer** 第3页声称 Assumptions 1、2 可推出 ||∇fi,t||≤Cf；第5至6页用它建立跨 T 的 sublinear regret；第6页 Remarks 10、12 作 T→∞ 和 t→∞ 解读。
- **evidence_pointer** 第3页式(3)下段及 Assumption 2(iii)；第5页式(12)、式(18)；第6页 Corollary 1、式(19)、市场模型；第7页表1。
- **evidence_status** located
- **Concern** 紧集上的逐时刻连续性只保证每个固定 t 的梯度有界，不能推出与时域 T 无关的共同 Cf。允许梯度按 t 的多项式变化时，Cf(T)可以随 T 增长。仿真中 τi,t=60t、βi,t=bi t，γi,t固定，因而 ∂Ji,t/∂Pi=(bi-60)t+2γiPi+(ΣkPk+Pi)/12，在固定紧可行集上包含非零线性漂移。这里不能把其上界当作不随 T 变化的常数。如果额外要求在所有 t≥1 上统一有界，结合 Assumption 2(iii) 的有限阶多项式时间结构，则对每个固定决策点，梯度关于 t 的非恒定多项式系数必须消失，所剩模型无法支持所强调的持续快速变动均衡。
- **Why it matters** 大O中隐藏的时域增长会改变甚至消除次线性 regret 保证。有限时域数值结果无法补足无限时域常数问题。固定紧集还会使本文线性价格模型最终可能触及边界，有限窗口路径近似线性也不能直接证实无限时域持续线性增长。
- **resolution_test** 明列所有常数对 T 的依赖，给出假设下真实有效的 regret 界。构造非平凡、满足完整假设且拥有所宣称渐近路径行为的游戏族；或将结论收窄为有限时域预测跟踪保证，避免不受支持的渐近 no-regret 宣称。

### R1-M3

- **Severity** Major
- **Blocking** Yes
- **Axis** technical soundness
- **issue_key** feedback-oracle-and-exact-prediction
- **claim_pointer** 第2页问题定义称玩家决策后才收到其成本；第4页 Remark 7 称使用 t-1 的信息；第5页式(8)认定当前梯度预测误差为零。
- **evidence_pointer** 第2页 Section 3 首段；第3页 Assumption 2(iii)；第4页预测梯度定义和 Remark 7；第5页 Theorem 1 证明开头及式(8)。
- **evidence_status** located
- **Concern** 算法要求在每个内部候选点求上一时刻梯度函数及最高 n 阶时间导数，且首次 t=1 要用 t=0 的信息。问题段落所明确提供的成本反馈，不能自动提供这些完整函数及导数。假设导数存在不等于玩家已知或可精确观测导数。另一方面，在这些导数已知且有限阶时间多项式严格成立时，Taylor 展开确实精确恢复当前梯度。这是强预测信息模型中的结果，不能未经限定地解释为对一般不可预见的快速变化环境仍无悔。
- **Why it matters** 当前信息集决定算法是否可实现，也决定与已有 online 方法是否在解决同一难度的问题。式(8)不是普通近似技巧，而是消除了整个预测残差。
- **resolution_test** 写出每轮决策前后可用信息、反馈 oracle、导数获取和初始信息协议。把标题摘要与结论限定到该模型，或加入预测残差项、噪声敏感性和可实施的导数估计。与同样拥有导数预测信息的方法比较，明确单纯增大路径长度与不可预测性之间的差别。

### R1-M4

- **Severity** Major
- **Blocking** No
- **Axis** technical soundness
- **issue_key** summation-rate-range
- **claim_pointer** 第6页 Corollary 1 声称对全部 0<a<2 有 Reg_i(T)≤O(T^(1-a/2))。
- **evidence_pointer** 第6页式(19)下方 ∑t^(-a)≤∫1^T t^(-a)dt≤O(T^(1-a)) 的推导。
- **evidence_status** located
- **Concern** 该求和阶数对 a≥1 不成立。a=1 时为 O(log T)，1<a<2 时和趋于正常数，不是趋零的 O(T^(1-a))。此外从1开始的正递减序列之和并不小于文中所写积分。若暂且接受此前各界且常数统一，式(19)能支持的分段界为 0<a<1 时 O(T^(1-a/2))，a=1 时 O(sqrt(T log T))，1<a<2 时 O(sqrt T)。这不是说更强结论绝无可能，而是现有推导不能证明它。
- **Why it matters** 其影响最醒目的 regret 速率表述，但修正后的分段界仍为次线性，所以此项单独不阻断定性目标，前提是其他问题被解决。
- **resolution_test** 修正求和不等式、参数范围和分段速率，或提供独立的更强证明，并同步修改 Remark 10 等解释。

### R1-M5

- **Severity** Major
- **Blocking** No
- **Axis** scientific importance
- **issue_key** per-slot-resource-and-matched-comparison
- **claim_pointer** 第1页摘要及第7至8页称较已有算法性能更好，且既有算法不能处理该类问题。
- **evidence_pointer** 第4页 Algorithm 1 内循环；第6页 Corollary 1 的 m≥1/αT^3；第6页仿真设置 αt=1/sqrt(t)、m=3000；第7至8页图3至图5与结论。
- **evidence_status** located
- **Concern** 取得该保证的充分条件要求 m≥T^(3a)，每个外部时隙都执行 m 次局部优化与通信。仿真每时隙使用3000次内部更新，但没有按同等导数信息、通信轮数、梯度调用数或时延预算展示比较。因此图形的优势尚不能区分预测信息、计算预算和算法本身的贡献。固定 m 的单个在线过程与针对每个 T 调节 m 的算法族也应区分。
- **Why it matters** 这一点决定该技术在真实快速环境里能否及时完成计算，以及它是否足以称为面向更广泛科学计算的重大框架进展。
- **resolution_test** 报告总体通信和计算复杂度、时隙容许时延及 m 的作用；加入预算和信息匹配的比较与消融。把未获保证、个别例子表现差和原则上不能应用三个命题分开。

## Minor Comments

### R1-m1

- **Severity** Minor
- **Blocking** No
- **Axis** readability for nonspecialists
- **claim_pointer** 第3页将式(2)称为动态 regret 并用来描述玩家无悔。
- **evidence_pointer** 第3页式(2)、Remark 1。
- **Issue** 式(2)两项均将其他玩家固定在当时均衡 x*_-i,t，而不是实际其他玩家决策 x_-i,t。它评估的是相对于均衡环境的单玩家偏离成本，非技术读者容易将其理解成实际交互中实现的收益损失。
- **Required correction / resolution_test** 在首次定义处用一句直白语言解释此差别，并说明它与实际成本或 Nash gap 的关系和局限。

### R1-m2

- **Severity** Minor
- **Blocking** No
- **Axis** technical soundness
- **claim_pointer** 第4页只限定 αt∈R+ 非递增，第5页用式(4b)得到 yk∈Ω 和凸性式(14)。
- **evidence_pointer** 第4页步长定义、式(4b)；第5页 Lemma 2 证明及式(14)。
- **Issue** 这些局部步骤要求 0<αt≤1，正且非递增本身不充分。推论所选 αt=t^(-a)满足此条件，故这是一般定理陈述中可局部修正的漏写。
- **Required correction / resolution_test** 在算法和 Theorem 1 的条件中明确步长上界，并核对其他初始化域。尤其是估计玩家 j 决策的初值应与 Ωj 兼容，而第4页当前统一写入 Ωi。

## 必须先解决的技术障碍

R1-M1、R1-M2、R1-M3 阻断当前一般理论主张的成立。R1-M4 需要更正定量速率，R1-M5 需要明确代价与优势来源。这些是针对所提供文本的独立检查，不意味着对已发表文章作正式更正判断，也不意味着全部算法结果必然错误。

## 五轴与期刊层面的判断

| 五轴 | 本文可见证据及判断 |
|---|---|
| originality | 预测梯度、多步镜像下降和有向图估计的组合具有清楚的专业问题导向。未穷尽查新，不能认证首创。现有比较尚未排除信息和预算差异。 |
| scientific importance | 针对快速移动均衡的保证可能有意义，但需先修复理论链，并证明并非只在精确可预测且大量内迭代的条件下有效。 |
| interdisciplinary readership | 应用动机涉及电力等领域，但实际证据只有一个12公司理想化模型，尚未建立跨领域的新科学结论或共同原理。 |
| technical soundness | 有可核验的证明断点、常数问题和信息模型缺口，见阻断项。不能把期刊定位问题替代为技术有效性评价。 |
| readability for nonspecialists | 专业结构紧凑，但没有清楚告诉外部读者何以能摆脱通常的动态环境困难，以及为此交换了什么信息和资源。 |

Nature 主刊所要求的 outstanding scientific importance 和 interdisciplinary conclusion，不能从一个专业 regret 界和一个应用仿真直接推出。这里的距离主要是科学意义和影响范围的证据，以及当前必须先解决的理论有效性问题。Nature Communications 的门槛不等于一定要跨学科，但要说明对本领域专家构成怎样的重要推进；本文须先明确相对于同信息、同预算框架的实质进步。Nature Computational Science 也不能仅因提出算法就认为匹配，需建立重大计算方法或框架如何推进科学研究的证据链。

“为什么这样做”可以从文中技术依赖回答。精确时间外推为当前不可见梯度提供可用替代，内循环让当前时刻的求解误差足够小，邻居估计处理分布式可见性，平均输出便于把累积距离界转为单时隙决策界。这套选择服务于可证明性和当前问题定义。不能据此推断作者心理、投稿策略或真实编辑决定。

## 内部覆盖与不确定性边界

已检查 novelty-significance、experimental-design、reproducibility、figures-and-tables、writing-clarity、claim-moderation。mechanism-evidence 在此仅指算法保证的逻辑来源，已通过预测和通信证据链检查；不存在需要评估的物理因果机制。统计推断、临床、伦理、数据资源和因果识别轴与本设计无直接对应，不据此制造问题。源码与原始数值复现不可评估，图线不能当作完整数值验证，也没有据缺少未提供材料推定数据存在问题。

**Recommendation posture** 若按当前版本模拟投稿前评审，应先进行实质性理论复核与主张收窄，再讨论 Nature 系列的目标读者和重要性。无法从本材料推断真实编辑决定或录用概率。
