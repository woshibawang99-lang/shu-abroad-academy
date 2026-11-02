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
