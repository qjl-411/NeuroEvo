from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TopicOut(BaseModel):
    slug: str
    name_zh: str
    description: str = ""
    score: float | None = None


class PaperOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    openalex_id: str
    doi: str | None = None
    title: str
    abstract: str = ""
    publication_year: int | None = None
    publication_date: str | None = None
    work_type: str | None = None
    authors: str = ""
    journal: str = ""
    cited_by_count: int = 0
    is_oa: bool = False
    oa_status: str | None = None
    pdf_url: str | None = None
    landing_page_url: str | None = None
    primary_custom_topic: str | None = None
    local_pdf_path: str | None = None
    has_local_pdf: bool = False
    relevance_score: int = 0
    search_rank: float | None = None
    topics: list[TopicOut] = Field(default_factory=list)
    openalex_topics: list[dict] = Field(default_factory=list)


class PaperPageOut(BaseModel):
    items: list[PaperOut]
    total: int
    page: int
    page_size: int
    pages: int


class YearStatOut(BaseModel):
    year: int
    count: int


class TopicStatOut(BaseModel):
    slug: str
    name_zh: str
    description: str
    count: int
