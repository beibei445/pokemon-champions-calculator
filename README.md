# 冠军实验室

宝可梦冠军中文伤害计算器。支持双向伤害、普通/Mega 独立形态、种族值与实际能力、每项 32/总计 66 的能力点、性格、特性、道具、当前 HP、强化、状态、天气、场地、单/双打、壁和多段命中概率。

## Windows 本地启动

在本目录运行 `npm install`（初次使用），然后运行 `npm run dev`，打开 http://127.0.0.1:5173 。也可双击 `启动计算器.cmd`。终端关闭后本地服务停止。

`npm run build` 构建静态网站，`npm run preview` 预览构建结果。全部宝可梦图像和名称数据均已保存在项目中；Google 字体不可用时使用系统字体。

## 验证

`npm test` 验证冠军能力公式、分配限制、Mega、确定的伤害向量、天气、残血、双打、免疫、壁、要害、披带、结实、多段独立卷积、固定伤害、愤怒门牙、蛮干、一击必杀和缺少条件的招式。

`node scripts/browser-check.mjs` 使用 Windows 的 Microsoft Edge 检查搜索、形态切换、招式、交换、重置、能力点限制和移动端布局。截图保存在 `verification/`，不会发布到网站。

## 数据与规则

- 引擎为 `@smogon/calc` 0.12.0，冠军专用 `Generations.get(0)`，固定 50 级。HP = base + SP + 75；其他能力 = floor((base + SP + 20) × nature)。
- 358 个宝可梦形态、335 个攻击招式，来自冠军引擎数据库；不保证当前赛季参赛资格，不校验宝可梦学习表。
- 双倍奉还、镜面反射、金属爆炸、复仇、喷出、围攻需要本次界面未提供的历史或队伍信息，已禁用并标注原因。
- 引擎未覆盖的愤怒门牙、蛮干和一击必杀在 `engine.mjs` 中补足；先通过引擎的非零威力探测尊重属性、特性与场地免疫。金属爪的冠军数据缺失威力、属性与分类，按标准 50 威力/钢/物理补足，并保留冠军切割标记。
- 满 HP 气势披带与结实对单次命中保留 1 HP；多次命中按独立随机数求和，忽略未命中的概率。理论伤害区间显示保护前数值。结实阻止一击必杀；破格可绕过结实。
- 自动天气和场地按面板速度选择后触发的特性；同速或速度等级、讲究围巾影响入场顺序时需手动指定。双打范围招式默认存在多个目标。
- 不含回合末天气、回复、反伤和后续回合；不含未提供输入的搭档特性效果（友情防守可显式设置）。
- 浏览器 WebMCP API 可用时提供只读 `calculate_current_matchup` 工具，读取与界面相同的双向结果。当前环境未提供原生 WebMCP 验证上下文。

名称：[PokéAPI](https://github.com/PokeAPI/pokeapi)。图像：[PokéAPI sprites](https://github.com/PokeAPI/sprites) 和 [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/dex/)。伤害引擎：[Smogon](https://github.com/smogon/damage-calc)。形态元数据：[pkmn/dex](https://github.com/pkmn/dex)。项目未复用其他计算器的页面或代码。

宝可梦及相关形象为 Nintendo / Game Freak / Creatures 的知识产权；本工具为非官方爱好者项目。
