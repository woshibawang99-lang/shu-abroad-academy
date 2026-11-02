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

