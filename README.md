# TE-Speed-FlashVSR 1.0

[FlashVSR](https://github.com/OpenImagingLab/FlashVSR) 视频超分辨率放大 ComfyUI 节点，为放大视频带来全链路新一轮加速。

TE-Speed-FlashVSR 以 [FlashVSR](https://github.com/OpenImagingLab/FlashVSR) 推理项目为基础，加入独立的执行预算控制、空间分块、显存分阶段策略,使用新的 [SpargeAttn](https://github.com/thu-ml/SpargeAttn) 稀疏注意力适配，以及独家TE加速的视频合并编码节点,为放大视频带来全链路新一轮加速。

## 1.0 

- 支持 `FlashVSR-v1.1` ,为 ComfyUI 内 flashVSR 视频超分带来极速体验。
- 独家 TE-Speed Video Combine，为 ComfyUI 合并视频帧提速50%。
- 支持 `tiny` 与 `tiny-long` `Full` 推理模式。
- 支持 `full` 推理模式：使用完整 Wan VAE 解码，不依赖 TCDecoder。
- 支持 `sparse_sage2` 与 FlashVSR 原生 `block_sparse_attn` 两种 LCSA 稀疏注意力。
- 独家 TE-Speed 运动感知动态加速，动态调整保留量和局部注意力范围。
- 支持 `detail`、`balanced`、`throughput` 三种质量与速度配置。
- 支持独立的执行预算控制、空间分块、显存分阶段策略。

## TE-Speed 动态加速

TE-Speed-FlashVSR 不只是将 FlashVSR 接入 ComfyUI。1.0 加入了面向视频内容的动态稀疏注意力预算调度加速
```text
分析相邻帧的运动变化
        ↓
为每个时间块计算运动强度
        ↓
动态调整 Top-K、KV 保留量和局部注意力范围
        ↓
使用 SpargeAttn CUDA 稀疏内核执行注意力
```






## 环境要求

- Windows x64
- ComfyUI
- ComfyUI 使用 Python 3.13 的便携环境
- NVIDIA GPU
- 支持当前 GPU 架构的 `spas_sage_attn` wheel
- 使用 `block_sparse_attn` 后端时，需要兼容的 `block_sparse_attn` wheel

spas_sage_attn轮子: https://pan.quark.cn/s/bc51d1a415f6

- FFmpeg；TE-Speed Video Combine 默认使用 NVIDIA `h264_nvenc`



可下载 ComfyUI TE整合包 v260619 torch2.12. cuda132 python3.13
链接：https://pan.quark.cn/s/63ed157ef549


## 模型目录

模型下载地址: https://pan.quark.cn/s/1c959a8eb44c

默认模型目录为：

```text
ComfyUI/models/FlashVSR-v1.1/
```

使用 `full` 模式时，该目录还必须包含 `Wan2.1_VAE.pth`；`tiny` 和 `tiny-long` 使用 `TCDecoder.ckpt`，不需要加载 Wan VAE。


## 节点

### TE-Speed-FlashVSR Model

模型加载节点。

- `model`：选择 `FlashVSR-v1.1` 或 `FlashVSR`。
- `mode`：`tiny`、`tiny-long` 或 `full`。`full` 使用 Wan VAE，显存和解码时间更高；`tiny` 系列使用 TCDecoder，速度更快。建议用tiny.
- `precision`：`bf16` 或 `fp16`。
- `device`：建议使用 `auto`，也可以指定 CUDA 设备。

### TE-Speed-FlashVSR Settings

推理设置节点，输出连接到 Restore 节点的 `settings` 输入。

- `quality_profile`
  - `detail`：优先画面细节。
  - `balanced`：速度与质量平衡，推荐默认值。
  - `throughput`：优先处理速度。
- `intensity`：动态预算策略的作用强度。
- `spatial_strategy`
  - `auto`：根据尺寸自动选择整帧或分块。
  - `full_frame`：强制整帧处理，适合较小画面。
  - `adaptive_tiles`：强制使用空间分块。
- `memory_policy`
  - `auto`：根据尺寸和帧数自动决定。
  - `resident`：尽量保持模块常驻设备。
  - `staged`：分阶段调度，适合显存较紧张的情况。
- `attention_budget`：稀疏注意力预算，数值越高通常保留更多全局信息。
- `kv_retention`：历史 KV 保留比例，数值越高通常更偏向质量。
- `local_radius`：局部注意力范围，可选 9 或 11。
- `max_tile_edge`：空间分块的最大输入边长，默认 256。
- `blend_overlap`：分块输出融合区域，默认 24。
- `preprocess_batch`：预处理批量大小，显存不足时可调低。
- `attention_backend`
  - `sparse_sage2`：默认，使用 SpargeAttn CUDA 后端。
  - `block_sparse_attn`：使用 FlashVSR 原始 128×128 block mask 与 CUDA 后端。
  - `auto`：整帧处理使用 `block_sparse_attn`，空间分块使用 `sparse_sage2`。

推荐默认设置即可.

`full` 模式会沿用 TE 的稀疏注意力、动态时间块预算、空间切片和显存调度；它不能使用 Tiny 专用的 `TCDecoder` 加速。Full 的 VAE 解码默认启用内部分块，以降低高分辨率下的峰值显存。`staged` 会在 DiT 去噪与 Wan VAE 解码之间换载模型；`resident` 会尽量同时保持两者，速度更高但需要更多显存。


### TE-Speed-FlashVSR

视频恢复与放大节点。

- `model`：连接模型加载节点。
- `frames`：输入 ComfyUI `IMAGE` 帧批次。
- `settings`：可选，连接 Settings 节点。
- `scale`：支持 2 倍或 4 倍输出。
- `color_fix`：启用颜色修正。
- `seed`：控制随机过程。

该节点输出的是 ComfyUI 的 `IMAGE` 帧批次，不是 MP4 文件。输出格式为：



### TE-Speed Video Combine

合并视频加速节点,提供节点内预览。

- `images`：连接 TE-Speed-FlashVSR 输出的帧。
- `frame_rate`：输出帧率。
- `filename_prefix`：输出文件名前缀。
- `value`：并行处理级别，默认 3。
- `save_output`：保存到 ComfyUI 输出目录。
- `audio`：可选，连接音频。




### 显存不足

按以下顺序尝试：

1. 将 `spatial_strategy` 设为 `auto` 或 `adaptive_tiles`。
2. 将 `max_tile_edge` 调低到 256 或 192。
3. 将 `preprocess_batch` 调低到 2 或 1。
4. 将 `memory_policy` 设为 `staged`。
5. 降低输出尺寸或处理帧数。
