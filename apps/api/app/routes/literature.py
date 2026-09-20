from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.literature import repository
from app.literature.pdf_download import resolve_local_pdf_path
from app.literature.schemas import PaperOut, PaperPageOut, TopicOut, TopicStatOut, YearStatOut


router = APIRouter(prefix="/literature", tags=["literature"])


@router.get("/papers", response_model=PaperPageOut)
def papers(
    q: str | None = Query(default=None, max_length=300),
    year: int | None = Query(default=None, ge=1900, le=2100),
    year_from: int | None = Query(default=None, ge=1900, le=2100),
    year_to: int | None = Query(default=None, ge=1900, le=2100),
    topic: str | None = Query(default=None, max_length=80),
    oa: bool | None = None,
    sort: Literal["relevance", "citations", "latest", "oldest"] = "relevance",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaperPageOut:
    if year is None and year_from is not None and year_to is not None and year_from > year_to:
        raise HTTPException(status_code=422, detail="year_from cannot be greater than year_to")
    result = repository.list_papers(
        query=q,
        year=year,
        year_from=year_from,
        year_to=year_to,
        topic=topic,
        oa=oa,
        sort=sort,
        page=page,
        page_size=page_size,
    )
    return PaperPageOut.model_validate(result)


@router.get("/papers/{paper_id}", response_model=PaperOut)
def paper_detail(paper_id: int) -> PaperOut:
    paper = repository.get_paper(paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    return PaperOut.model_validate(paper)


@router.get("/papers/{paper_id}/pdf")
def paper_pdf(paper_id: int, download: bool = False) -> FileResponse:
    paper = repository.get_paper(paper_id)
    if paper is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paper not found")
    local_path = resolve_local_pdf_path(paper.get("local_pdf_path"))
    if local_path is None:
        detail = "Local PDF is not available yet. Run the literature PDF localization command first."
        if paper.get("pdf_url"):
            detail += " An external open-access PDF URL is recorded for this paper."
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    return FileResponse(
        path=local_path,
        media_type="application/pdf",
        filename=f"neuroevo-paper-{paper_id}.pdf",
        content_disposition_type="attachment" if download else "inline",
        headers={"X-NeuroEvo-PDF-Source": "local"},
    )


@router.get("/topics", response_model=list[TopicOut])
def topics() -> list[TopicOut]:
    return [TopicOut.model_validate(item) for item in repository.list_topics()]


@router.get("/stats/years", response_model=list[YearStatOut])
def stats_years(
    q: str | None = Query(default=None, max_length=300),
    topic: str | None = Query(default=None, max_length=80),
    oa: bool | None = None,
) -> list[YearStatOut]:
    return [YearStatOut.model_validate(item) for item in repository.year_stats(query=q, topic=topic, oa=oa)]


@router.get("/stats/topics", response_model=list[TopicStatOut])
def stats_topics(
    q: str | None = Query(default=None, max_length=300),
    year: int | None = Query(default=None, ge=1900, le=2100),
    year_from: int | None = Query(default=None, ge=1900, le=2100),
    year_to: int | None = Query(default=None, ge=1900, le=2100),
    oa: bool | None = None,
) -> list[TopicStatOut]:
    if year is None and year_from is not None and year_to is not None and year_from > year_to:
        raise HTTPException(status_code=422, detail="year_from cannot be greater than year_to")
    return [
        TopicStatOut.model_validate(item)
        for item in repository.topic_stats(query=q, year=year, year_from=year_from, year_to=year_to, oa=oa)
    ]
