from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable


@dataclass(frozen=True)
class TopicRule:
    slug: str
    name_zh: str
    description: str
    patterns: tuple[str, ...]
    priority: int


TOPIC_RULES: tuple[TopicRule, ...] = (
    TopicRule(
        slug="diagnosis_classification",
        name_zh="MRI辅助诊断与分类",
        description="CN/MCI/AD 分类、辅助诊断与筛查。",
        patterns=(
            r"\bclassif(?:y|ication|ier|ying)\w*\b",
            r"\bdiagnos(?:e|is|tic)\w*\b",
            r"\bdetection\b",
            r"\bscreening\b",
            r"\bcomputer[- ]aided\b",
            r"\bCN\b.*\bMCI\b",
            r"\bMCI\b.*\bAD\b",
            r"\bnormal control\w*\b",
            r"\bcognitively normal\b",
        ),
        priority=100,
    ),
    TopicRule(
        slug="mci_progression",
        name_zh="MCI转换与疾病进展",
        description="sMCI、pMCI、MCI→AD、预后与疾病进展预测。",
        patterns=(
            r"\bMCI\b.{0,30}\bconvert\w*\b",
            r"\bconvert\w*\b.{0,30}\bAlzheimer\w*\b",
            r"\bconversion\b",
            r"\bpMCI\b",
            r"\bsMCI\b",
            r"\bMCI[- ]?(?:to|2)[- ]?AD\b",
            r"\bprogression prediction\b",
            r"\bdisease progression\b",
            r"\bprognos\w*\b",
            r"\bconverter\w*\b",
        ),
        priority=110,
    ),
    TopicRule(
        slug="staging_longitudinal",
        name_zh="AD分期与纵向研究",
        description="CN/EMCI/LMCI/AD 多阶段建模、疾病分期与纵向变化。",
        patterns=(
            r"\bstag(?:e|ing)\w*\b",
            r"\blongitudinal\b",
            r"\btrajectory\b",
            r"\bdisease stage\w*\b",
            r"\bEMCI\b",
            r"\bLMCI\b",
            r"\bmulti[- ]stage\b",
            r"\bserial MRI\b",
            r"\bfollow[- ]?up\b",
        ),
        priority=105,
    ),
    TopicRule(
        slug="atrophy_biomarkers",
        name_zh="脑萎缩与区域影像标志物",
        description="海马、皮层厚度、灰质、脑体积与脑萎缩等 MRI 影像标志物。",
        patterns=(
            r"\bhippocamp\w*\b",
            r"\bcortical thickness\b",
            r"\bcortex thickness\b",
            r"\bbrain atrophy\b",
            r"\bcerebral atrophy\b",
            r"\bgray matter\b",
            r"\bgrey matter\b",
            r"\bbrain volume\b",
            r"\bvolumetr\w*\b",
            r"\bentorhinal\b",
            r"\bamygdala\b",
            r"\bregional biomarker\w*\b",
            r"\bmorphometr\w*\b",
        ),
        priority=90,
    ),
    TopicRule(
        slug="deep_learning",
        name_zh="深度学习与Transformer",
        description="CNN、3D CNN、Attention、Transformer、自监督与深度神经网络。",
        patterns=(
            r"\bdeep learning\b",
            r"\bneural network\w*\b",
            r"\bCNN\b",
            r"\bconvolutional neural\b",
            r"\b3D[- ]?CNN\b",
            r"\btransformer\w*\b",
            r"\battention (?:network|mechanism|module|model)\w*\b",
            r"\bvision transformer\b",
            r"\bViT\b",
            r"\bself[- ]supervised\b",
            r"\bcontrastive learning\b",
            r"\bautoencoder\w*\b",
            r"\bgraph neural network\w*\b",
        ),
        priority=95,
    ),
    TopicRule(
        slug="explainable_ai",
        name_zh="可解释AI与显著性分析",
        description="XAI、Grad-CAM、SHAP、Saliency、归因与模型解释。",
        patterns=(
            r"\bexplainab\w*\b",
            r"\binterpretab\w*\b",
            r"\bXAI\b",
            r"\bGrad[- ]?CAM\b",
            r"\bSHAP\b",
            r"\bsaliency\b",
            r"\battribution\b",
            r"\bfeature importance\b",
            r"\bactivation map\w*\b",
            r"\battention map\w*\b",
        ),
        priority=120,
    ),
    TopicRule(
        slug="multimodal_fusion",
        name_zh="多模态影像与数据融合",
        description="MRI+PET、MRI+临床、MRI+基因等多模态数据融合。",
        patterns=(
            r"\bmultimodal\b",
            r"\bmulti[- ]modal\b",
            r"\bdata fusion\b",
            r"\bfeature fusion\b",
            r"\bMRI\b.{0,60}\bPET\b",
            r"\bPET\b.{0,60}\bMRI\b",
            r"\bMRI\b.{0,60}\bclinical\b",
            r"\bMRI\b.{0,60}\bgenetic\w*\b",
            r"\bMRI\b.{0,60}\bCSF\b",
        ),
        priority=100,
    ),
    TopicRule(
        slug="preprocessing_segmentation",
        name_zh="分割、配准与预处理",
        description="脑区分割、图像配准、FreeSurfer 与 MRI 预处理流程。",
        patterns=(
            r"\bsegment(?:ation|ing)\w*\b",
            r"\bregistration\b",
            r"\bpreprocess\w*\b",
            r"\bFreeSurfer\b",
            r"\bskull stripping\b",
            r"\bbias field correction\b",
            r"\bspatial normalization\b",
            r"\bbrain extraction\b",
            r"\bparcellation\b",
        ),
        priority=80,
    ),
    TopicRule(
        slug="datasets_benchmarks",
        name_zh="数据集与基准",
        description="ADNI、OASIS、AIBL、NACC、MIRIAD 等数据集、基准和评测。",
        patterns=(
            r"\bADNI\b",
            r"\bAlzheimer'?s Disease Neuroimaging Initiative\b",
            r"\bOASIS\b",
            r"\bOpen Access Series of Imaging Studies\b",
            r"\bAIBL\b",
            r"\bNACC\b",
            r"\bMIRIAD\b",
            r"\bbenchmark\w*\b",
            r"\bbenchmark dataset\b",
            r"\bpublic dataset\b",
        ),
        priority=70,
    ),
    TopicRule(
        slug="generalization_uncertainty",
        name_zh="泛化、外部验证与不确定性",
        description="多中心、外部验证、域适配、校准、不确定性与跨数据集泛化。",
        patterns=(
            r"\bexternal validation\b",
            r"\bgenerali[sz](?:e|ation|ability)\w*\b",
            r"\bdomain adaptation\b",
            r"\bdomain shift\b",
            r"\bcalibrat\w*\b",
            r"\buncertaint\w*\b",
            r"\bmulti[- ]?center\b",
            r"\bmulticenter\b",
            r"\bcross[- ]dataset\b",
            r"\bcross[- ]site\b",
            r"\bsite effect\w*\b",
            r"\bharmonization\b",
        ),
        priority=115,
    ),
    TopicRule(
        slug="reviews",
        name_zh="综述与系统评价",
        description="Narrative review、systematic review、scoping review 与 meta-analysis。",
        patterns=(
            r"\bsystematic review\b",
            r"\bscoping review\b",
            r"\bmeta[- ]analysis\b",
            r"\breview\b",
            r"\bliterature review\b",
            r"\bsurvey\b",
        ),
        priority=60,
    ),
)


_COMPILED_TOPIC_RULES: tuple[tuple[TopicRule, tuple[re.Pattern[str], ...]], ...] = tuple(
    (rule, tuple(re.compile(pattern, flags=re.IGNORECASE | re.DOTALL) for pattern in rule.patterns))
    for rule in TOPIC_RULES
)

_DISEASE_PATTERNS = tuple(
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\bAlzheimer(?:'s)?(?: disease)?\b",
        r"\bmild cognitive impairment\b",
        r"\bMCI\b",
        r"\bADNI\b",
        r"\bOASIS\b.{0,40}\bAlzheimer\b",
        r"\bdementia\b",
    )
)

_CORE_PATTERNS = tuple(
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\bMRI\b",
        r"\bmagnetic resonance imag\w*\b",
        r"\bstructural magnetic resonance\b",
        r"\bstructural MRI\b",
        r"\bsMRI\b",
        r"\bneuroimag\w*\b",
        r"\bhippocamp\w*\b",
        r"\bcortical thickness\b",
        r"\bbrain atrophy\b",
        r"\bdeep learning\b",
        r"\bmachine learning\b",
        r"\bneural network\w*\b",
        r"\bCNN\b",
        r"\btransformer\w*\b",
        r"\bexplainab\w*\b",
        r"\bGrad[- ]?CAM\b",
        r"\bSHAP\b",
        r"\bADNI\b",
        r"\bOASIS\b",
    )
)

_EXCLUSION_PATTERNS = tuple(
    re.compile(pattern, flags=re.IGNORECASE)
    for pattern in (
        r"\bmouse model\b",
        r"\bmice\b",
        r"\brat model\b",
        r"\btransgenic mice\b",
        r"\bcell culture\b",
    )
)


def normalize_openalex_topics(topics: Iterable[dict] | None) -> str:
    if not topics:
        return ""
    names: list[str] = []
    for topic in topics:
        if not isinstance(topic, dict):
            continue
        display_name = topic.get("display_name")
        if display_name:
            names.append(str(display_name))
        subfield = topic.get("subfield") or {}
        field = topic.get("field") or {}
        domain = topic.get("domain") or {}
        for value in (subfield.get("display_name"), field.get("display_name"), domain.get("display_name")):
            if value:
                names.append(str(value))
    return " | ".join(dict.fromkeys(names))


def build_classification_text(title: str | None, abstract: str | None, openalex_topics: Iterable[dict] | None = None) -> str:
    return "\n".join(
        part for part in (title or "", abstract or "", normalize_openalex_topics(openalex_topics)) if part
    )


def relevance_score(title: str | None, abstract: str | None, openalex_topics: Iterable[dict] | None = None) -> int:
    text = build_classification_text(title, abstract, openalex_topics)
    if not text.strip():
        return 0

    title_text = title or ""
    disease_matches = sum(1 for p in _DISEASE_PATTERNS if p.search(text))
    core_matches = sum(1 for p in _CORE_PATTERNS if p.search(text))
    exclusions = sum(1 for p in _EXCLUSION_PATTERNS if p.search(text))

    score = disease_matches * 3 + core_matches * 2 - exclusions * 2
    if any(p.search(title_text) for p in _DISEASE_PATTERNS):
        score += 3
    if any(p.search(title_text) for p in _CORE_PATTERNS):
        score += 2
    return score


def is_relevant_work(title: str | None, abstract: str | None, openalex_topics: Iterable[dict] | None = None) -> bool:
    text = build_classification_text(title, abstract, openalex_topics)
    if not text.strip():
        return False
    disease = any(pattern.search(text) for pattern in _DISEASE_PATTERNS)
    core = any(pattern.search(text) for pattern in _CORE_PATTERNS)
    return disease and core and relevance_score(title, abstract, openalex_topics) >= 5


def classify_topics(
    title: str | None,
    abstract: str | None,
    openalex_topics: Iterable[dict] | None = None,
) -> list[tuple[str, float]]:
    text = build_classification_text(title, abstract, openalex_topics)
    if not text.strip():
        return []

    title_text = title or ""
    classified: list[tuple[str, float, int]] = []
    for rule, patterns in _COMPILED_TOPIC_RULES:
        body_hits = sum(1 for pattern in patterns if pattern.search(text))
        if not body_hits:
            continue
        title_hits = sum(1 for pattern in patterns if pattern.search(title_text))
        score = min(1.0, 0.35 + body_hits * 0.12 + title_hits * 0.18)
        classified.append((rule.slug, round(score, 3), rule.priority))

    classified.sort(key=lambda item: (item[1], item[2]), reverse=True)
    return [(slug, score) for slug, score, _ in classified]


def primary_topic(classified: list[tuple[str, float]]) -> str | None:
    return classified[0][0] if classified else None


def topic_seed_rows() -> list[tuple[str, str, str]]:
    return [(rule.slug, rule.name_zh, rule.description) for rule in TOPIC_RULES]
