/**
 * github.js — GitHub profile enrichment stage.
 *
 * Mirrors github.py from interviewstreet/hiring-agent (MIT © HackerRank).
 * Fetches contributor counts and commit signals so the evaluator can
 * distinguish self_project vs open_source repos.
 */

'use strict';

const GITHUB_API = 'https://api.github.com';
const MAX_REPOS = 30;
const MAX_CONTRIBUTOR_LOOKUPS = 6;
const MAX_ALL_REPOS_META = 20;
const TOP_PROJECTS_COUNT = 7;

function githubHeaders() {
    const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'FutureTracker-ResumeAgent/1.0',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
}

function extractGithubUsername(structuredResume) {
    const profiles = structuredResume?.basics?.profiles || [];
    for (const profile of profiles) {
        const url = (profile.url || '').toLowerCase();
        if (url.includes('github.com/')) {
            const match = url.match(/github\.com\/([a-z0-9-]+)/i);
            if (match && match[1] && !['sponsors', 'topics'].includes(match[1])) {
                return match[1];
            }
        }
        const network = (profile.network || '').toLowerCase();
        if (network === 'github' && profile.url) {
            const m = profile.url.match(/github\.com\/([a-z0-9-]+)/i);
            if (m) return m[1];
        }
    }
    return null;
}

async function fetchGithubProfile(username) {
    const res = await fetch(`${GITHUB_API}/users/${username}`, {
        headers: githubHeaders(),
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
}

async function fetchRepos(username) {
    const res = await fetch(
        `${GITHUB_API}/users/${username}/repos?per_page=${MAX_REPOS}&sort=updated&type=all`,
        {
            headers: githubHeaders(),
            signal: AbortSignal.timeout(15000),
        }
    );
    if (!res.ok) return [];
    return res.json();
}

async function fetchRepoContributors(owner, repoName) {
    const res = await fetch(
        `${GITHUB_API}/repos/${owner}/${repoName}/contributors?per_page=100`,
        {
            headers: githubHeaders(),
            signal: AbortSignal.timeout(10000),
        }
    );
    if (!res.ok) return [];
    return res.json();
}

function countAuthorCommits(username, contributors) {
    let authorCommits = 0;
    let totalCommits = 0;

    for (const contributor of contributors) {
        const contributions = contributor.contributions || 0;
        totalCommits += contributions;
        if ((contributor.login || '').toLowerCase() === username.toLowerCase()) {
            authorCommits = contributions;
        }
    }

    return { authorCommits, totalCommits };
}

function filterRepos(repos) {
    return repos
        .filter((repo) => !(repo.fork && (repo.forks_count || 0) < 5))
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
}

function buildRepoSummary(repo) {
    return {
        name: repo.name,
        description: repo.description || '',
        github_url: repo.html_url,
        url: repo.html_url,
        language: repo.language || null,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        isOwner: !repo.fork,
        github_details: {
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            language: repo.language || null,
            fork: repo.fork || false,
        },
    };
}

async function buildRepoMetadata(username, repos) {
    const filteredRepos = filterRepos(repos);
    const lookupRepos = filteredRepos.slice(0, MAX_CONTRIBUTOR_LOOKUPS);

    const projects = await Promise.all(lookupRepos.map(async (repo) => {
        let contributors = [];
        try {
            contributors = await fetchRepoContributors(username, repo.name);
        } catch {
            contributors = [];
        }

        const { authorCommits, totalCommits } = countAuthorCommits(username, contributors);
        if (authorCommits === 0) return null;

        const contributorCount = contributors.length;
        const projectType = contributorCount > 1 ? 'open_source' : 'self_project';

        return {
            ...buildRepoSummary(repo),
            project_type: projectType,
            contributor_count: contributorCount,
            author_commit_count: authorCommits,
            total_commit_count: totalCommits,
        };
    }));

    return {
        projects: projects.filter(Boolean),
        allReposMeta: filteredRepos.slice(0, MAX_ALL_REPOS_META).map(buildRepoSummary),
    };
}

function pickTopProjects(repoMetadata) {
    return repoMetadata
        .sort((a, b) => (b.stars + b.forks + b.author_commit_count) - (a.stars + a.forks + a.author_commit_count))
        .slice(0, TOP_PROJECTS_COUNT)
        .map((r) => r.name);
}

async function enrichWithGithub(structuredResume, _llmOptions) {
    const username = extractGithubUsername(structuredResume);
    if (!username) return null;

    let profile;
    let repos;
    try {
        [profile, repos] = await Promise.all([
            fetchGithubProfile(username),
            fetchRepos(username),
        ]);
    } catch (err) {
        console.warn('[resume-agent] GitHub enrichment skipped:', err.message);
        return null;
    }

    if (!profile || !Array.isArray(repos)) return null;

    const { projects, allReposMeta } = await buildRepoMetadata(username, repos);
    const topProjectNames = projects.length > 0 ? pickTopProjects(projects) : [];

    return {
        username,
        publicRepos: profile.public_repos || 0,
        followers: profile.followers || 0,
        topProjects: topProjectNames,
        projects,
        allReposMeta,
        totalStars: projects.reduce((sum, repo) => sum + (repo.stars || 0), 0),
    };
}

module.exports = { enrichWithGithub };

.catch(err => console.error("Promise.all failed:", err));