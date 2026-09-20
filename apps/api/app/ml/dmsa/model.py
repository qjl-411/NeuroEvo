from __future__ import annotations

import hashlib

import torch
import torch.nn as nn


class Swish(nn.Module):
    def __init__(self, beta: float = 1.0):
        super().__init__()
        self.beta = nn.Parameter(torch.tensor(beta))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * torch.sigmoid(self.beta * x)


class SpatialAttentionModule(nn.Module):
    def __init__(self, kernel_size: int = 7):
        super().__init__()
        padding = kernel_size // 2
        self.spatial_conv = nn.Conv2d(
            1, 1, kernel_size=kernel_size, padding=padding, bias=False
        )
        self.bn = nn.BatchNorm2d(1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x_mean = torch.mean(x, dim=1, keepdim=True)
        spatial_map = self.spatial_conv(x_mean)
        spatial_map = self.bn(spatial_map)
        spatial_map = self.sigmoid(spatial_map)
        return x * spatial_map


class MultiScaleDilatedConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        num_branches = 3
        channels_per_branch = out_channels // num_branches
        padding_channels = out_channels % num_branches
        if padding_channels > 0:
            channels_list = [
                channels_per_branch + 1 if i < padding_channels else channels_per_branch
                for i in range(num_branches)
            ]
        else:
            channels_list = [channels_per_branch] * num_branches

        self.dilated_conv1 = nn.Sequential(
            nn.Conv2d(in_channels, channels_list[0], 3, padding=1, dilation=1, bias=False),
            nn.BatchNorm2d(channels_list[0]),
            Swish(beta=1.0),
        )
        self.dilated_conv3 = nn.Sequential(
            nn.Conv2d(in_channels, channels_list[1], 3, padding=3, dilation=3, bias=False),
            nn.BatchNorm2d(channels_list[1]),
            Swish(beta=1.0),
        )
        self.dilated_conv5 = nn.Sequential(
            nn.Conv2d(in_channels, channels_list[2], 3, padding=5, dilation=5, bias=False),
            nn.BatchNorm2d(channels_list[2]),
            Swish(beta=1.0),
        )
        self.actual_out_channels = sum(channels_list)
        self.fusion_conv = nn.Conv2d(
            self.actual_out_channels, out_channels, kernel_size=1, bias=False
        )
        self.fusion_bn = nn.BatchNorm2d(out_channels)
        self.swish = Swish(beta=1.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out1 = self.dilated_conv1(x)
        out3 = self.dilated_conv3(x)
        out5 = self.dilated_conv5(x)
        out = torch.cat([out1, out3, out5], dim=1)
        out = self.fusion_conv(out)
        out = self.fusion_bn(out)
        return self.swish(out)


class EnhancedDualPathBottleneck(nn.Module):
    expansion = 4

    def __init__(
        self,
        inplanes: int,
        planes: int,
        stride: int = 1,
        downsample: nn.Module | None = None,
        groups: int = 32,
        base_width: int = 4,
        use_spatial_attention: bool = True,
        use_multi_scale: bool = True,
    ):
        super().__init__()
        width = int(planes * (base_width / 64.0)) * groups

        self.path1_conv1 = nn.Conv2d(inplanes, width // 2, 1, stride=stride, bias=False)
        self.path1_bn1 = nn.BatchNorm2d(width // 2)
        self.path1_conv2 = nn.Conv2d(
            width // 2,
            width // 2,
            3,
            padding=1,
            groups=groups // 2,
            bias=False,
        )
        self.path1_bn2 = nn.BatchNorm2d(width // 2)
        self.path1_conv3 = nn.Conv2d(
            width // 2, planes * self.expansion // 2, 1, bias=False
        )
        self.path1_bn3 = nn.BatchNorm2d(planes * self.expansion // 2)

        self.path2_conv1 = nn.Conv2d(inplanes, width // 2, 1, stride=stride, bias=False)
        self.path2_bn1 = nn.BatchNorm2d(width // 2)
        self.use_multi_scale = use_multi_scale
        if use_multi_scale:
            self.path2_conv2 = MultiScaleDilatedConv(width // 2, width // 2)
        else:
            self.path2_conv2 = nn.Sequential(
                nn.Conv2d(
                    width // 2,
                    width // 2,
                    3,
                    padding=1,
                    groups=width // 2,
                    bias=False,
                ),
                nn.BatchNorm2d(width // 2),
                Swish(beta=1.0),
            )
        self.path2_conv3 = nn.Conv2d(
            width // 2, planes * self.expansion // 2, 1, bias=False
        )
        self.path2_bn3 = nn.BatchNorm2d(planes * self.expansion // 2)

        self.fusion_conv = nn.Conv2d(
            planes * self.expansion, planes * self.expansion, 1, bias=False
        )
        self.fusion_bn = nn.BatchNorm2d(planes * self.expansion)

        self.use_spatial_attention = use_spatial_attention
        if use_spatial_attention:
            self.spatial_attention = SpatialAttentionModule(kernel_size=7)

        self.swish = Swish(beta=1.0)
        self.downsample = downsample
        self.stride = stride

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x

        out1 = self.path1_conv1(x)
        out1 = self.path1_bn1(out1)
        out1 = self.swish(out1)
        out1 = self.path1_conv2(out1)
        out1 = self.path1_bn2(out1)
        out1 = self.swish(out1)
        out1 = self.path1_conv3(out1)
        out1 = self.path1_bn3(out1)

        out2 = self.path2_conv1(x)
        out2 = self.path2_bn1(out2)
        out2 = self.swish(out2)
        out2 = self.path2_conv2(out2)
        out2 = self.path2_conv3(out2)
        out2 = self.path2_bn3(out2)

        out = torch.cat([out1, out2], dim=1)
        out = self.fusion_conv(out)
        out = self.fusion_bn(out)
        out = self.swish(out)

        if self.use_spatial_attention:
            out = self.spatial_attention(out)
        if self.downsample is not None:
            identity = self.downsample(x)
        out += identity
        return self.swish(out)


class InterLayerFusion(nn.Module):
    def __init__(self, low_channels: int, high_channels: int):
        super().__init__()
        self.align_conv = nn.Conv2d(low_channels, high_channels, 1, bias=False)
        self.align_bn = nn.BatchNorm2d(high_channels)
        self.attention = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(high_channels * 2, high_channels // 4, 1, bias=False),
            nn.ReLU(inplace=True),
            nn.Conv2d(high_channels // 4, high_channels, 1, bias=False),
            nn.Sigmoid(),
        )
        self.swish = Swish(beta=1.0)

    def forward(self, low_feat: torch.Tensor, high_feat: torch.Tensor) -> torch.Tensor:
        low_feat_down = nn.functional.interpolate(
            low_feat, scale_factor=0.5, mode="bilinear", align_corners=False
        )
        low_feat_aligned = self.align_conv(low_feat_down)
        low_feat_aligned = self.align_bn(low_feat_aligned)
        low_feat_aligned = self.swish(low_feat_aligned)
        concat_feat = torch.cat([low_feat_aligned, high_feat], dim=1)
        attention_weights = self.attention(concat_feat)
        return high_feat * attention_weights + low_feat_aligned * (1 - attention_weights)


class EnhancedResNeXt50(nn.Module):
    def __init__(self, num_classes: int = 4):
        super().__init__()
        layers_config = [
            (64, 64, 3),
            (256, 128, 4),
            (512, 256, 6),
            (1024, 512, 3),
        ]
        self.conv1 = nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.swish = Swish(beta=1.0)
        self.maxpool = nn.MaxPool2d(kernel_size=3, stride=2, padding=1)

        self.layer1 = self._make_layer(
            layers_config[0], block_idx=0, use_spatial_attention=False, use_multi_scale=False
        )
        self.layer2 = self._make_layer(
            layers_config[1], block_idx=1, stride=2, use_spatial_attention=False, use_multi_scale=False
        )
        self.layer3 = self._make_layer(
            layers_config[2], block_idx=2, stride=2, use_spatial_attention=True, use_multi_scale=True
        )
        self.layer4 = self._make_layer(
            layers_config[3], block_idx=3, stride=2, use_spatial_attention=True, use_multi_scale=True
        )
        self.fusion23 = InterLayerFusion(512, 1024)
        self.fusion34 = InterLayerFusion(1024, 2048)
        self.avgpool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes),
        )
        self._init_weights()

    def _make_layer(
        self,
        config: tuple[int, int, int],
        block_idx: int,
        stride: int = 1,
        use_spatial_attention: bool = False,
        use_multi_scale: bool = False,
    ) -> nn.Sequential:
        del block_idx  # retained to mirror the frozen training signature
        inplanes, planes, blocks = config
        downsample = None
        if stride != 1 or inplanes != planes * 4:
            downsample = nn.Sequential(
                nn.Conv2d(inplanes, planes * 4, 1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * 4),
            )
        layers: list[nn.Module] = [
            EnhancedDualPathBottleneck(
                inplanes,
                planes,
                stride,
                downsample,
                use_spatial_attention=use_spatial_attention,
                use_multi_scale=use_multi_scale,
            )
        ]
        for _ in range(1, blocks):
            layers.append(
                EnhancedDualPathBottleneck(
                    planes * 4,
                    planes,
                    use_spatial_attention=use_spatial_attention,
                    use_multi_scale=use_multi_scale,
                )
            )
        return nn.Sequential(*layers)

    def _init_weights(self) -> None:
        for module in self.modules():
            if isinstance(module, nn.Conv2d):
                nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(module, nn.BatchNorm2d):
                nn.init.constant_(module.weight, 1)
                nn.init.constant_(module.bias, 0)
            elif isinstance(module, nn.Linear):
                nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
                if module.bias is not None:
                    nn.init.constant_(module.bias, 0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.swish(x)
        x = self.maxpool(x)
        x1 = self.layer1(x)
        x2 = self.layer2(x1)
        x3 = self.layer3(x2)
        x3_fused = self.fusion23(x2, x3)
        x4 = self.layer4(x3_fused)
        x4_fused = self.fusion34(x3, x4)
        x = self.avgpool(x4_fused)
        x = torch.flatten(x, 1)
        return self.fc(x)


def create_model(num_classes: int = 4) -> EnhancedResNeXt50:
    return EnhancedResNeXt50(num_classes=num_classes)


def architecture_fingerprint(model: nn.Module) -> str:
    parts = [
        f"{name}|{tuple(tensor.shape)}|{tensor.dtype}"
        for name, tensor in model.state_dict().items()
    ]
    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()
