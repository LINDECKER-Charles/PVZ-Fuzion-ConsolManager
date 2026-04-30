from __future__ import annotations

from pathlib import Path

from pvz_console import config


def test_discover_falls_back_to_canonical_when_no_candidate_exists(monkeypatch, tmp_path):
    """All four candidate paths point at non-existent dirs → returns canonical."""
    nowhere = tmp_path / "no-pvz-here"
    nowhere.mkdir()
    monkeypatch.setattr(config, "REPO_ROOT", nowhere)
    monkeypatch.chdir(nowhere)
    discovered = config._discover_project_root()
    assert discovered == (nowhere / config.PROJECT_DIR_NAME).resolve()


def test_discover_returns_first_existing_candidate(monkeypatch, tmp_path):
    """Module-imported PROJECT_ROOT cannot be re-tested live, but we can simulate
    the search by repointing REPO_ROOT at a tmp tree containing the folder."""
    fake_repo = tmp_path / "fake-repo"
    (fake_repo / config.PROJECT_DIR_NAME).mkdir(parents=True)
    monkeypatch.setattr(config, "REPO_ROOT", fake_repo)
    discovered = config._discover_project_root()
    assert discovered == (fake_repo / config.PROJECT_DIR_NAME).resolve()
