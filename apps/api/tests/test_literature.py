from __future__ import annotations

import importlib

from fastapi.testclient import TestClient


def _configure_temp_db(monkeypatch, tmp_path):
    db_path = tmp_path / "literature.db"
    monkeypatch.setenv("NEUROEVO_LITERATURE_DATABASE", str(db_path))

    from app import config
    importlib.reload(config)

    from app.literature import database
    importlib.reload(database)
    return db_path


def test_topic_classifier_detects_multiple_topics():
    from app.literature.topics import classify_topics

    topics = classify_topics(
        "Explainable Transformer classification of Alzheimer's disease using ADNI MRI",
        "We apply Grad-CAM to a 3D convolutional transformer on structural MRI from ADNI.",
        [],
    )
    slugs = {slug for slug, _ in topics}
    assert "diagnosis_classification" in slugs
    assert "deep_learning" in slugs
    assert "explainable_ai" in slugs
    assert "datasets_benchmarks" in slugs


def test_repository_search_and_facets(monkeypatch, tmp_path):
    _configure_temp_db(monkeypatch, tmp_path)

    from app.literature.database import init_database
    from app.literature.repository import list_papers, topic_stats, upsert_paper, year_stats

    init_database()
    record = {
        "openalex_id": "WTEST1",
        "doi": "10.1000/test",
        "title": "Transformer MRI classification for Alzheimer's disease",
        "abstract": "A deep learning study using ADNI MRI for Alzheimer's disease classification.",
        "publication_year": 2024,
        "publication_date": "2024-05-01",
        "work_type": "article",
        "authors": "Test Author",
        "journal": "Test Journal",
        "cited_by_count": 7,
        "is_oa": True,
        "oa_status": "gold",
        "pdf_url": "https://example.org/test.pdf",
        "landing_page_url": "https://example.org/test",
        "openalex_topics_json": "[]",
    }
    upsert_paper(record, [("deep_learning", 0.9), ("diagnosis_classification", 0.8)], 12)

    page = list_papers(query="Transformer MRI", topic="deep_learning")
    assert page["total"] == 1
    assert page["items"][0]["openalex_id"] == "WTEST1"
    assert year_stats(topic="deep_learning") == [{"year": 2024, "count": 1}]
    topic_counts = {item["slug"]: item["count"] for item in topic_stats(year=2024)}
    assert topic_counts["deep_learning"] == 1


def test_literature_api(monkeypatch, tmp_path):
    _configure_temp_db(monkeypatch, tmp_path)

    from app.literature.database import init_database
    init_database()

    from app.main import app
    client = TestClient(app)

    response = client.get("/api/v1/literature/topics")
    assert response.status_code == 200
    assert len(response.json()) == 11

    response = client.get("/api/v1/literature/papers")
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_openalex_work_normalization():
    from app.literature.openalex import work_to_record

    work = {
        "id": "https://openalex.org/W123",
        "doi": "https://doi.org/10.1234/ABC",
        "title": "Alzheimer MRI study",
        "abstract_inverted_index": {"Alzheimer": [0], "MRI": [1], "study": [2]},
        "publication_year": 2025,
        "publication_date": "2025-01-10",
        "type": "article",
        "cited_by_count": 12,
        "authorships": [
            {"author": {"display_name": "Alice Example"}},
            {"author": {"display_name": "Bob Example"}},
        ],
        "primary_location": {
            "landing_page_url": "https://journal.example/paper",
            "source": {"display_name": "Imaging Journal"},
        },
        "best_oa_location": {
            "pdf_url": "https://repo.example/paper.pdf",
            "landing_page_url": "https://repo.example/paper",
        },
        "open_access": {"is_oa": True, "oa_status": "green"},
        "topics": [{"id": "https://openalex.org/T1", "display_name": "Alzheimer disease"}],
        "primary_topic": {"id": "https://openalex.org/T1", "display_name": "Alzheimer disease"},
    }

    record = work_to_record(work)
    assert record["openalex_id"] == "W123"
    assert record["doi"] == "10.1234/abc"
    assert record["abstract"] == "Alzheimer MRI study"
    assert record["authors"] == "Alice Example, Bob Example"
    assert record["journal"] == "Imaging Journal"
    assert record["is_oa"] is True
    assert record["pdf_url"] == "https://repo.example/paper.pdf"


def test_sync_pipeline_with_fake_openalex(monkeypatch, tmp_path):
    _configure_temp_db(monkeypatch, tmp_path)

    from app.literature.repository import global_stats
    from app.literature.sync import sync_openalex

    work = {
        "id": "https://openalex.org/WFAKE",
        "doi": "https://doi.org/10.1000/fake",
        "title": "Explainable deep learning for Alzheimer disease classification from MRI",
        "abstract_inverted_index": {
            "Grad-CAM": [0],
            "and": [1],
            "Transformer": [2],
            "models": [3],
            "classify": [4],
            "ADNI": [5],
            "MRI": [6],
            "for": [7],
            "Alzheimer": [8],
            "disease": [9],
        },
        "publication_year": 2025,
        "publication_date": "2025-02-01",
        "type": "article",
        "cited_by_count": 4,
        "authorships": [{"author": {"display_name": "Researcher One"}}],
        "primary_location": {"source": {"display_name": "MRI Journal"}},
        "best_oa_location": {"pdf_url": "https://example.org/fake.pdf"},
        "open_access": {"is_oa": True, "oa_status": "green"},
        "topics": [{"display_name": "Alzheimer disease"}],
        "primary_topic": None,
    }

    class FakeClient:
        def iter_works(self, **kwargs):
            yield work
            yield work

        def close(self):
            return None

    summary = sync_openalex(
        from_year=2024,
        to_year=2026,
        max_per_query=10,
        queries=["fake query"],
        client=FakeClient(),
    )
    assert summary.candidate_count == 2
    assert summary.unique_count == 1
    assert summary.relevant_count == 1
    assert summary.inserted_count == 1
    assert summary.error_count == 0
    assert global_stats()["total"] == 1
