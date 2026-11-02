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
